export interface RepositorySummary {
  id: string;
  provider: string;
  name: string;
  fullName: string;
  defaultBranch?: string | null;
  cloneUrl?: string | null;
  alias?: string | null;
  linkedAt: string;
}
