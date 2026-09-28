// @ts-check

const sidebars = {
  platformSidebar: [
    {
      type: 'category',
      label: 'Tutorial: Appointment reminders',
      collapsed: false,
      link: { type: 'doc', id: 'tutorial/index' },
      items: [
        {
          type: 'category',
          label: 'Part 1: Build it',
          collapsed: false,
          items: [
            'tutorial/setup',
            'tutorial/hello-world',
            'tutorial/book-an-appointment',
            'tutorial/store-appointments',
            'tutorial/confirm-by-sms',
            'tutorial/send-reminders',
            'tutorial/remind-only-once',
            'tutorial/dont-block-booking',
            'tutorial/notifications-service'
          ]
        },
        {
          type: 'category',
          label: 'Part 2: Model and expose it',
          collapsed: false,
          items: [
            'tutorial/entities',
            'tutorial/ontology',
            'tutorial/graphql',
            'tutorial/natural-keys'
          ]
        },
        {
          type: 'category',
          label: 'Part 3: Become a data hub',
          collapsed: false,
          items: [
            'tutorial/transformers',
            'tutorial/pipelines',
            'tutorial/sync-from-a-database',
            'tutorial/dead-letters',
            'tutorial/medallion-and-lineage',
            'tutorial/flows'
          ]
        },
        {
          type: 'category',
          label: 'Part 4: Operate it',
          collapsed: false,
          items: [
            'tutorial/operate-it',
            'tutorial/admin-api'
          ]
        },
        {
          type: 'category',
          label: 'Part 5: Scale it',
          collapsed: false,
          items: [
            'tutorial/separate-processes',
            'tutorial/discovery'
          ]
        },
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
        'concepts/domain-model',
        'concepts/data-pipelines',
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
        'configuration/entities',
        'configuration/graphqls',
        'configuration/sqls',
        'configuration/pipelines-and-flows',
        'configuration/admins',
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
