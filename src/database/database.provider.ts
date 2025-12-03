import { db } from "./index";

export const DatabaseProvider = {
  provide: "DATABASE",
  useValue: db,
};