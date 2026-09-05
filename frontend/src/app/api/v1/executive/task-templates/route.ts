import { NextRequest, NextResponse } from 'next/server';
import { 
  SAVED_TASK_TEMPLATES, 
  getSavedTaskTemplates, 
  updateSavedTaskTemplate, 
  createBatchLiveTasks,
  TaskDepartment
} from '@/lib/liveTasksStore';

export const dynamic = 'force-dynamic';

// GET /api/v1/executive/task-templates?department=Housekeeping
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department') as TaskDepartment | null;

    const templates = getSavedTaskTemplates(department || undefined);

    return NextResponse.json({
      success: true,
      templates,
      count: templates.length
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT /api/v1/executive/task-templates - Update template standard SLA minutes, title, default staff
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, updates } = body;

    if (!id || !updates) {
      return NextResponse.json(
        { success: false, message: 'Template id and updates are required' }, 
        { status: 400 }
      );
    }

    const updated = updateSavedTaskTemplate(id, updates);
    if (!updated) {
      return NextResponse.json(
        { success: false, message: `Template with ID "${id}" not found` }, 
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Template "${updated.title}" updated successfully`,
      template: updated
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST /api/v1/executive/task-templates - Batch assign saved template to 1 or multiple rooms
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      template_id, 
      department, 
      title, 
      room_numbers, 
      assigned_to, 
      staff_role, 
      priority, 
      standard_sla_minutes, 
      notes 
    } = body;

    if (!room_numbers || !Array.isArray(room_numbers) || room_numbers.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one room number is required in room_numbers array' }, 
        { status: 400 }
      );
    }

    if (!department || !title || !assigned_to) {
      return NextResponse.json(
        { success: false, message: 'Department, title, and assigned_to are required' }, 
        { status: 400 }
      );
    }

    const createdTasks = createBatchLiveTasks({
      templateId: template_id,
      department,
      title,
      room_numbers,
      assigned_to,
      staff_role,
      priority,
      standard_sla_minutes: Number(standard_sla_minutes) || 20,
      notes
    });

    return NextResponse.json({
      success: true,
      message: `Successfully dispatched ${createdTasks.length} live tasks`,
      tasks: createdTasks,
      count: createdTasks.length
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
