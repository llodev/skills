/**
 * Smoke test — hits the REAL Linear GraphQL endpoint.
 * GATED: skipped when LINEAR_API_KEY is not set.
 *
 * Purpose: validate the GraphQL query shapes that the init flow depends on.
 * Read-only only — never mutates Linear data.
 */
import { describe, it, expect } from "vitest";
import { stripEnvQuotes } from "../src/init-flow.js";

const API_KEY = process.env.LINEAR_API_KEY ? stripEnvQuotes(process.env.LINEAR_API_KEY) : undefined;

const GQL_URL = "https://api.linear.app/graphql";

async function gql<T>(
  apiKey: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(GQL_URL, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Linear GraphQL HTTP ${res.status}`);
  const body = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (body.errors?.length) throw new Error(`Linear GraphQL: ${body.errors[0].message}`);
  if (!body.data) throw new Error("Linear GraphQL: no data");
  return body.data;
}

// Skip all tests when no API key
const describeOrSkip = API_KEY ? describe : describe.skip;

describeOrSkip("Linear GraphQL smoke (real API — read-only)", () => {
  it("teams query: nodes contain {id, key, name}", async () => {
    const data = await gql<{
      teams: { nodes: Array<{ id: string; key: string; name: string }> };
    }>(API_KEY!, `{ teams { nodes { id key name } } }`);

    expect(data.teams).toBeDefined();
    expect(Array.isArray(data.teams.nodes)).toBe(true);
    expect(data.teams.nodes.length).toBeGreaterThan(0);

    const team = data.teams.nodes[0];
    expect(typeof team.id).toBe("string");
    expect(team.id.length).toBeGreaterThan(0);
    expect(typeof team.key).toBe("string");
    expect(typeof team.name).toBe("string");
  });

  it("workflow states query: nodes contain {id, name, type}", async () => {
    // Fetch teams first to get a real team id
    const teamsData = await gql<{
      teams: { nodes: Array<{ id: string }> };
    }>(API_KEY!, `{ teams { nodes { id } } }`);

    const teamId = teamsData.teams.nodes[0]?.id;
    expect(teamId).toBeTruthy();

    const data = await gql<{
      team: { states: { nodes: Array<{ id: string; name: string; type: string }> } };
    }>(API_KEY!, `query($id: String!) { team(id: $id) { states { nodes { id name type } } } }`, {
      id: teamId,
    });

    expect(data.team).toBeDefined();
    expect(Array.isArray(data.team.states.nodes)).toBe(true);
    expect(data.team.states.nodes.length).toBeGreaterThan(0);

    const state = data.team.states.nodes[0];
    expect(typeof state.id).toBe("string");
    expect(typeof state.name).toBe("string");
    expect(typeof state.type).toBe("string");
    // type must be one of the valid Linear state types
    expect(["triage", "backlog", "unstarted", "started", "completed", "cancelled"]).toContain(
      state.type,
    );
  });

  it("team settings query: cyclesEnabled and issueEstimationType present", async () => {
    const teamsData = await gql<{
      teams: { nodes: Array<{ id: string }> };
    }>(API_KEY!, `{ teams { nodes { id } } }`);

    const teamId = teamsData.teams.nodes[0]?.id;
    expect(teamId).toBeTruthy();

    const data = await gql<{
      team: { cyclesEnabled: boolean; issueEstimationType: string };
    }>(API_KEY!, `query($id: String!) { team(id: $id) { cyclesEnabled issueEstimationType } }`, {
      id: teamId,
    });

    expect(typeof data.team.cyclesEnabled).toBe("boolean");
    expect(typeof data.team.issueEstimationType).toBe("string");
    // "notUsed" means estimation disabled; other values mean enabled
    expect(data.team.issueEstimationType.length).toBeGreaterThan(0);
  });
});
