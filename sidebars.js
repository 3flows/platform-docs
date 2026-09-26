// @ts-check

const sidebars = {
  platformSidebar: [
    {
      type: 'category',
      label: 'Tutorial: Appointment reminders',
      collapsed: false,
      link: { type: 'doc', id: 'tutorial/index' },
      items: [
        'tutorial/hello-world',
        'tutorial/book-an-appointment',
        'tutorial/store-appointments',
        'tutorial/confirm-by-sms',
        'tutorial/send-reminders',
        'tutorial/remind-only-once',
        'tutorial/dont-block-booking',
        'tutorial/notifications-service',
        'tutorial/separate-processes',
        'tutorial/whats-next'
      ]
    },
    'why',
    {
      type: 'category',
      label: 'Core Concepts',
      collapsed: true,
      items: [
        'concepts/platform-runtime',
        'concepts/services-and-routes',
        'concepts/discovery',
        'concepts/ownership',
        'concepts/idempotency'
      ]
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: true,
      items: [
        'guides/service-to-service-calls',
        'guides/testing',
        'guides/distributed-platform',
        'guides/singleton-timers',
        'guides/mq-idempotency',
        'guides/email-and-sms-idempotency',
        'guides/deployment'
      ]
    },
    {
      type: 'category',
      label: 'Configuration Reference',
      collapsed: true,
      items: [
        'configuration/overview',
        'configuration/services',
        'configuration/https',
        'configuration/mqs',
        'configuration/timers',
        'configuration/registries-discovery',
        'configuration/coordinators',
        'configuration/idempotencies'
      ]
    }
  ]
};

module.exports = sidebars;
