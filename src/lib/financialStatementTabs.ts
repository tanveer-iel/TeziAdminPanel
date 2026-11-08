/**
 * Statement types offered when adding or editing a financial statement.
 * The spelling ("Finantials") is the value already stored in the database,
 * so do not correct it here without also migrating the existing rows.
 */
export const FINANCIAL_TABS = [
  { value: "Audited Finantials 30 June", label: "Audited Finantials 30 June" },
  { value: "Half Yearly 31 Dec", label: "Half Yearly 31 Dec" },
  { value: "Quarter Ended 30 Sept", label: "Quarter Ended 30 Sept" },
  { value: "Quarter Ended 31 March", label: "Quarter Ended 31 March" },
  { value: "LCB", label: "LCB" },
];
