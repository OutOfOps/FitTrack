/* eslint-disable no-restricted-globals */
importScripts('./ngsw-worker.js');

const BACKUP_SYNC_TAG = 'fittrack-backup';
const RESTORE_SYNC_TAG = 'fittrack-restore';
const REMINDERS_SYNC_TAG = 'fittrack-reminders';
const pendingSyncJobs = new Map();
let reminderSchedules = [];

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) {
    return;
  }

  switch (data.type) {
    case 'sync-engine:queue': {
      const { tag, job } = data.payload || {};
      if (!tag || !job) {
        return;
      }

      if (!pendingSyncJobs.has(tag)) {
        pendingSyncJobs.set(tag, []);
      }
      pendingSyncJobs.get(tag).push(job);

      if (typeof event.waitUntil === 'function') {
        event.waitUntil(
          self.registration.sync
            ? self.registration.sync.register(tag).catch((error) => {
                console.warn('Не вдалося зареєструвати Background Sync', error);
              })
            : Promise.resolve()
        );
      } else if (self.registration.sync) {
        self.registration.sync
          .register(tag)
          .catch((error) => console.warn('Не вдалося зареєструвати Background Sync', error));
      }
      break;
    }
    case 'sync-engine:complete': {
      const { tag, jobId } = data.payload || {};
      if (!tag || !jobId) {
        return;
      }

      const queue = pendingSyncJobs.get(tag);
      if (!queue) {
        return;
      }

      const index = queue.findIndex((job) => job.id === jobId);
      if (index !== -1) {
        queue.splice(index, 1);
      }
      if (!queue.length) {
        pendingSyncJobs.delete(tag);
      }
      break;
    }
    case 'reminders:update': {
      const { schedules } = data.payload || {};
      if (Array.isArray(schedules)) {
        reminderSchedules = schedules;
      }
      break;
    }
    default:
      break;
  }
});

self.addEventListener('sync', (event) => {
  if (!event.tag) {
    return;
  }

  if (event.tag === BACKUP_SYNC_TAG || event.tag === RESTORE_SYNC_TAG) {
    event.waitUntil(forwardJobsToClients(event.tag));
    return;
  }

  if (event.tag === REMINDERS_SYNC_TAG) {
    event.waitUntil(showReminderNotifications());
  }
});

async function forwardJobsToClients(tag) {
  const jobs = pendingSyncJobs.get(tag) || [];
  if (!jobs.length) {
    return;
  }

  const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  await Promise.all(
    clientsList.map((client) =>
      client.postMessage({
        type: 'sync-engine:trigger',
        payload: {
          tag,
          jobs
        }
      })
    )
  );
}

async function showReminderNotifications() {
  if (!reminderSchedules.length) {
    return;
  }

  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return;
  }

  const now = new Date();
  const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const hasVisibleClient = clientsList.some((client) => client.visibilityState === 'visible');

  for (const schedule of reminderSchedules) {
    if (!schedule.enabled) {
      continue;
    }

    const [hour, minute] = schedule.time.split(':').map((value) => Number.parseInt(value, 10));
    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      continue;
    }

    const scheduled = new Date(now);
    scheduled.setHours(hour, minute, 0, 0);
    const diffMinutes = Math.abs((scheduled.getTime() - now.getTime()) / 60000);

    if (diffMinutes <= 30 && self.registration.showNotification && !hasVisibleClient) {
      await self.registration.showNotification(schedule.label, {
        body: `Заплановано на ${schedule.time}`,
        tag: `reminder-${schedule.id}`,
        data: schedule
      });
    }
  }
}
