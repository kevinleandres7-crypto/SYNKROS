import { supabase, schedulesTable } from './supabase';
import { ScheduleEvent } from '../types';

export const scheduleFunctions = [
  {
    name: 'createEvent',
    description: 'Create a new schedule event in the calendar',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the event'
        },
        description: {
          type: 'string',
          description: 'Optional description of the event'
        },
        start_time: {
          type: 'string',
          description: 'Start time in ISO format (YYYY-MM-DDTHH:mm:ss)'
        },
        end_time: {
          type: 'string',
          description: 'End time in ISO format (YYYY-MM-DDTHH:mm:ss)'
        }
      },
      required: ['title', 'start_time', 'end_time']
    }
  },
  {
    name: 'updateEvent',
    description: 'Update an existing schedule event',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the event to update'
        },
        title: {
          type: 'string',
          description: 'New title of the event'
        },
        description: {
          type: 'string',
          description: 'New description of the event'
        },
        start_time: {
          type: 'string',
          description: 'New start time in ISO format (YYYY-MM-DDTHH:mm:ss)'
        },
        end_time: {
          type: 'string',
          description: 'New end time in ISO format (YYYY-MM-DDTHH:mm:ss)'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'deleteEvent',
    description: 'Delete a schedule event',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the event to delete'
        }
      },
      required: ['id']
    }
  }
];

export async function createEvent(
  userId: string,
  title: string,
  start_time: string,
  end_time: string,
  description?: string
): Promise<ScheduleEvent> {
  const { data, error } = await supabase
    .from(schedulesTable)
    .insert({
      user_id: userId,
      title,
      description,
      start_time,
      end_time
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEvent(
  id: string,
  updates: Partial<Pick<ScheduleEvent, 'title' | 'description' | 'start_time' | 'end_time'>>
): Promise<ScheduleEvent> {
  const { data, error } = await supabase
    .from(schedulesTable)
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from(schedulesTable)
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getEvents(userId: string, date?: string): Promise<ScheduleEvent[]> {
  let query = supabase
    .from(schedulesTable)
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: true });

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    query = query
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
