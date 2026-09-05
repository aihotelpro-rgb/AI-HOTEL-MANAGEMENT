import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllLiveTasks, 
  createNewLiveTask, 
  TaskDepartment, 
  LiveHotelTask 
} from '@/lib/liveTasksStore';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department') || undefined;
    const status = searchParams.get('status') || undefined;

    const allTasks = getAllLiveTasks();
    const filteredTasks = getAllLiveTasks(department, status);

    const activeTasks = allTasks.filter(t => t.status !== 'Completed');
    const onTimeCount = activeTasks.filter(t => t.sla_status === 'ON_TIME').length;
    const dueSoonCount = activeTasks.filter(t => t.sla_status === 'DUE_SOON').length;
    const overdueCount = activeTasks.filter(t => t.sla_status === 'OVERDUE').length;
    const completedCount = allTasks.filter(t => t.status === 'Completed').length;

    // Calculate department breakdown
    const departmentStats: Record<string, { total: number; active: number; overdue: number }> = {
      Housekeeping: { total: 0, active: 0, overdue: 0 },
      Maintenance: { total: 0, active: 0, overdue: 0 },
      Kitchen: { total: 0, active: 0, overdue: 0 },
      Runner: { total: 0, active: 0, overdue: 0 },
      FrontDesk: { total: 0, active: 0, overdue: 0 },
    };

    allTasks.forEach(t => {
      if (departmentStats[t.department]) {
        departmentStats[t.department].total += 1;
        if (t.status !== 'Completed') {
          departmentStats[t.department].active += 1;
          if (t.sla_status === 'OVERDUE') {
            departmentStats[t.department].overdue += 1;
          }
        }
      }
    });

    return NextResponse.json({
      tasks: filteredTasks,
      summary: {
        total: allTasks.length,
        active: activeTasks.length,
        on_time: onTimeCount,
        due_soon: dueSoonCount,
        overdue: overdueCount,
        completed: completedCount,
        department_breakdown: departmentStats
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, department, room_number, assigned_to, standard_sla_minutes, task_type, priority, notes } = body;

    if (!title || !department || !room_number) {
      return NextResponse.json({ error: 'Title, department, and room_number are required' }, { status: 400 });
    }

    const newTask = createNewLiveTask({
      title,
      department: department as TaskDepartment,
      room_number,
      assigned_to: assigned_to || "Department Duty Staff",
      standard_sla_minutes: Number(standard_sla_minutes) || 20,
      task_type: task_type || "Service Request",
      priority: priority || 'Normal',
      notes: notes || "Dispatched via GM Live Task Control"
    });

    return NextResponse.json({
      success: true,
      message: `Task ${newTask.id} created and dispatched to ${newTask.assigned_to} with ${newTask.standard_sla_minutes}m SLA window.`,
      task: newTask
    }, {
      status: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create task' }, { status: 500 });
  }
}
