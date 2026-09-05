import { NextRequest, NextResponse } from 'next/server';
import { 
  escalateTask, 
  completeTask, 
  computeTaskSLA, 
  LIVE_TASKS 
} from '@/lib/liveTasksStore';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const task = LIVE_TASKS.find(t => t.id === id);

  if (!task) {
    return NextResponse.json({ error: `Task ${id} not found` }, { status: 404 });
  }

  return NextResponse.json({ task: computeTaskSLA(task) }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
    }
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const action = body.action || (body.status === 'Completed' || body.status === 'Resolved' ? 'complete' : null);

    if (action === 'escalate' || body.escalated === true || body.priority === 'High') {
      const updated = escalateTask(id, body.note || body.notes);
      if (!updated) {
        return NextResponse.json({ error: `Task ${id} not found` }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        message: `Task ${id} has been marked URGENT & escalated to Department Lead!`,
        task: updated
      });
    }

    if (action === 'complete' || body.status === 'Completed' || body.status === 'Resolved') {
      const updated = completeTask(id);
      if (!updated) {
        return NextResponse.json({ error: `Task ${id} not found` }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        message: `Task ${id} marked COMPLETED successfully.`,
        task: updated
      });
    }

    // Direct field update fallback
    const index = LIVE_TASKS.findIndex(t => t.id === id);
    if (index === -1) {
      return NextResponse.json({ error: `Task ${id} not found` }, { status: 404 });
    }

    if (body.assigned_to) LIVE_TASKS[index].assigned_to = body.assigned_to;
    if (body.notes) LIVE_TASKS[index].notes = body.notes;
    if (body.status) LIVE_TASKS[index].status = body.status;

    const computed = computeTaskSLA(LIVE_TASKS[index]);
    return NextResponse.json({
      success: true,
      message: `Task ${id} updated`,
      task: computed
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update task' }, { status: 500 });
  }
}
