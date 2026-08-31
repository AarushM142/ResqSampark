
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const T1 = Date.now() - 20 * 60 * 1000;
const T2 = Date.now() - 15 * 60 * 1000;
const T3 = Date.now() - 5 * 60 * 1000;

const incidents = [
  {
    id: 'demo-001',
    type: 'FLOOD',
    location: 'Chinchwad',
    severity: 'CRITICAL',
    affected_count: 70,
    description: 'Need food, water and medical help.',
    status: 'UNASSIGNED',
    deleted: false,
    team_size_needed: 5,
    team_leader: null,
    related_incident_ids: [],
    created_at: T1,
    updated_at: T1,
  },
  {
    id: 'demo-002',
    type: 'FIRE',
    location: 'Nashik Industrial Belt',
    severity: 'MODERATE',
    affected_count: 25,
    description: 'Need fire response team and medical support.',
    status: 'UNASSIGNED',
    deleted: false,
    team_size_needed: 4,
    team_leader: null,
    related_incident_ids: [],
    created_at: T2,
    updated_at: T2,
  },
  {
    id: 'demo-003',
    type: 'FLOOD',
    location: 'Chinchwad',
    severity: 'CRITICAL',
    affected_count: 50,
    description: 'Second flood report — possible duplicate of demo-001. For duplicate-detection demo.',
    status: 'UNASSIGNED',
    deleted: false,
    team_size_needed: 3,
    team_leader: null,
    related_incident_ids: ['demo-001'],
    created_at: T3,
    updated_at: T3,
  },
];

async function seed() {
  console.log("Cleaning database...");
  await supabase.from('activity_logs').delete().neq('id', '0');
  await supabase.from('chat_messages').delete().neq('id', '0');
  await supabase.from('subtasks').delete().neq('id', '0');
  await supabase.from('task_assignees').delete().neq('task_id', '0');
  await supabase.from('tasks').delete().neq('id', '0');
  await supabase.from('resource_requests').delete().neq('id', '0');
  await supabase.from('incident_team_members').delete().neq('incident_id', '0');
  await supabase.from('incidents').delete().neq('id', '0');

  console.log("Seeding incidents...");
  const { error } = await supabase.from('incidents').insert(incidents);
  if (error) {
    console.error('Error inserting incidents:', error);
    return;
  }
  
  console.log("Seeding activity logs...");
  await supabase.from('activity_logs').insert([
    { id: 'log-1', incident_id: 'demo-001', device_id: 'demo-device', action: 'Reported by Worker demo-device', timestamp: T1 },
    { id: 'log-2', incident_id: 'demo-002', device_id: 'demo-device', action: 'Reported by Worker demo-device', timestamp: T2 },
    { id: 'log-3', incident_id: 'demo-003', device_id: 'demo-device-2', action: 'Reported by Worker demo-device-2', timestamp: T3 }
  ]);

  console.log("Seeding demo tasks...");
  const tasks = [
    {
      id: 'task-1',
      incident_id: 'demo-001',
      title: 'Evacuate trapped residents in Sector 4',
      description: 'Water levels rising rapidly. Priority rescue needed.',
      status: 'TODO',
      members_required: 3,
      created_by: 'system',
      status_changed_by: 'system',
      status_changed_at: T1,
      created_at: T1,
    },
    {
      id: 'task-2',
      incident_id: 'demo-001',
      title: 'Setup Emergency Distribution Point',
      description: 'Find high ground to distribute rations and water.',
      status: 'TODO',
      members_required: 2,
      created_by: 'system',
      status_changed_by: 'system',
      status_changed_at: T1,
      created_at: T1,
    }
  ];
  await supabase.from('tasks').insert(tasks);

  console.log("Seeding demo subtasks...");
  const subtasks = [
    { id: 'sub-1', task_id: 'task-1', label: 'Bring 10 life jackets', checked: false, created_by: 'system', created_at: T1 },
    { id: 'sub-2', task_id: 'task-1', label: 'Deploy inflatable raft', checked: false, created_by: 'system', created_at: T1 },
    { id: 'sub-3', task_id: 'task-2', label: 'Load 500L water', checked: false, created_by: 'system', created_at: T1 },
    { id: 'sub-4', task_id: 'task-2', label: 'Secure perimeter tape', checked: false, created_by: 'system', created_at: T1 }
  ];
  await supabase.from('subtasks').insert(subtasks);

  console.log("Database seeded successfully!");
}

seed();
