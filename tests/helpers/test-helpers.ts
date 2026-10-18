import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerTools } from '../../src/tools/handlers.js';

/** A client connected to a server with every tool registered, over the SDK's in-memory transport */
export async function connectClient(): Promise<Client> {
  const server = new McpServer({ name: 'apple-docs-mcp', version: 'test' });
  registerTools(server);
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: 'test' });
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
  return client;
}

export const mockData = {
  frameworkIndex: {
    interfaceLanguages: {
      swift: [
        {
          path: '/documentation/uikit/uiview',
          title: 'UIView',
          type: 'class',
          beta: false,
          deprecated: false,
          children: [],
        },
        {
          path: '/documentation/uikit/uiviewcontroller',
          title: 'UIViewController',
          type: 'class',
          beta: false,
          deprecated: false,
          children: [],
        },
        {
          path: '/documentation/uikit/uitableview',
          title: 'UITableView',
          type: 'class',
          beta: false,
          deprecated: false,
          children: [],
        },
        {
          path: '/documentation/uikit/uistackview',
          title: 'UIStackView',
          type: 'class',
          beta: false,
          deprecated: false,
          children: [],
        },
        {
          path: '/documentation/uikit/list',
          title: 'List',
          type: 'struct',
          beta: false,
          deprecated: false,
          children: [],
        },
      ],
      occ: [
        {
          path: '/documentation/uikit/uiview',
          title: 'UIView',
          type: 'class',
          beta: false,
          deprecated: false,
          children: [],
        },
      ],
    },
  },

  searchResultsHtml: `
    <html>
      <body>
        <script>
          window.searchData = {
            results: [
              {
                title: "UIView",
                url: "https://developer.apple.com/documentation/uikit/uiview",
                description: "An object that manages the content for a rectangular area on the screen.",
                type: "Documentation"
              },
              {
                title: "UIViewController",
                url: "https://developer.apple.com/documentation/uikit/uiviewcontroller",
                description: "An object that manages a view hierarchy for your UIKit app.",
                type: "Documentation"
              }
            ]
          };
        </script>
      </body>
    </html>
  `,

  docJsonData: {
    identifier: { url: 'doc://com.apple.uikit/documentation/UIKit/UIView', interfaceLanguage: 'swift' },
    primaryContentSections: [
      {
        kind: 'declarations',
        declarations: [
          {
            platforms: [],
            tokens: [
              { text: 'class', kind: 'keyword' },
              { text: ' ' },
              { text: 'UIView', kind: 'typeIdentifier' },
            ],
          },
        ],
      },
    ],
    metadata: {
      roleHeading: 'Class',
      title: 'UIView',
      modules: [{ name: 'UIKit' }],
    },
  },

  technologiesData: {
    technologies: [
      {
        name: 'UIKit',
        path: '/documentation/uikit',
        beta: false,
        deprecated: false,
        languages: ['swift', 'occ'],
      },
      {
        name: 'SwiftUI',
        path: '/documentation/swiftui',
        beta: false,
        deprecated: false,
        languages: ['swift'],
      },
    ],
  },
};

export const createTestFrameworkIndex = (items: any[]) => ({
  interfaceLanguages: {
    swift: items,
  },
});
