export function nextRunnable(tasks) {
  return tasks
    .filter((task) => task.status === "ready" && task.blocked !== true)
    .sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id))[0] || null;
}

export function completeTask(tasks, id) {
  return tasks.map((task) => task.id === id ? { ...task, status: "done" } : task);
}
