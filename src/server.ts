import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { pool } from "./database.js";
import express from "express";
import cors from "cors";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

class PostgresMCPServer {
  private server: Server;
  private expressApp: express.Application;

  constructor() {
    this.server = new Server(
      {
        name: "postgres-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.expressApp = express();
    this.setupExpress();
    this.setupMCPHandlers();
  }

  private setupExpress() {
    this.expressApp.use(cors());
    this.expressApp.use(express.json());

    // Health check endpoint
    this.expressApp.get("/health", (req, res) => {
      res.json({ status: "ok", service: "postgres-mcp-server" });
    });

    const port = process.env.MCP_PORT || 3001;
    this.expressApp.listen(port, () => {
      console.log(`🚀 MCP Server running on port ${port}`);
    });
  }

  private setupMCPHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = [
        {
          name: "query_database",
          description: "Execute SQL query on PostgreSQL database",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "SQL query to execute",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "get_tables",
          description: "Get list of all tables in the database",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_table_schema",
          description: "Get schema of a specific table",
          inputSchema: {
            type: "object",
            properties: {
              tableName: {
                type: "string",
                description: "Name of the table",
              },
            },
            required: ["tableName"],
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "query_database": {
            const { query } = args as { query: string };

            // Basic security check - prevent destructive operations
            if (this.isDestructiveQuery(query)) {
              throw new Error("Destructive operations are not allowed");
            }

            const result = await pool.query(query);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      rows: result.rows,
                      rowCount: result.rowCount,
                      fields: result.fields.map((f) => f.name),
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case "get_tables": {
            const result = await pool.query(`
              SELECT table_name 
              FROM information_schema.tables 
              WHERE table_schema = 'public'
            `);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    result.rows.map((row) => row.table_name),
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case "get_table_schema": {
            const { tableName } = args as { tableName: string };
            const result = await pool.query(
              `
              SELECT column_name, data_type, is_nullable
              FROM information_schema.columns
              WHERE table_name = $1
            `,
              [tableName]
            );

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result.rows, null, 2),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            },
          ],
        };
      }
    });
  }

  private isDestructiveQuery(query: string): boolean {
    const destructivePatterns = [
      /DROP\s+(TABLE|DATABASE)/i,
      /DELETE\s+FROM/i,
      /TRUNCATE/i,
      /ALTER\s+TABLE/i,
      /CREATE\s+TABLE/i,
      /INSERT\s+INTO/i,
      /UPDATE\s+\w+\s+SET/i,
    ];

    return destructivePatterns.some((pattern) => pattern.test(query));
  }

  async run() {
    // Test database connection
    await import("./database.js").then((mod) => mod.testConnection());

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log("✅ MCP Server started on stdio");
  }
}

const server = new PostgresMCPServer();
server.run().catch(console.error);
