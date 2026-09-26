// @ts-check

const sidebars = {
  platformSidebar: [
    'intro',
    'getting-started',
    {
      type: 'category',
      label: 'Core Concepts',
      collapsed: false,
      items: [
        'concepts/platform-runtime',
        'concepts/services-and-routes',
        'concepts/ownership',
        'concepts/idempotency',
        'concepts/discovery'
      ]
    },
    {
      type: 'category',
      label: 'Configuration Reference',
      collapsed: false,
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
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: false,
      items: [
        'guides/service-to-service-calls',
        'guides/distributed-platform',
        'guides/singleton-timers',
        'guides/mq-idempotency',
        'guides/email-and-sms-idempotency',
        'guides/testing',
        'guides/deployment'
      ]
    }
  ]
};

module.exports = sidebars;
