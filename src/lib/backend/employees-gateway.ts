import { supabase } from "@/integrations/supabase/client";
import { apiRequest, isSegempatApiConfigured } from "./api-client";
import type { EmployeeGateway, EmployeeRecord } from "./contracts";

const legacySupabaseEmployees: EmployeeGateway = {
  async list() {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("full_name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as EmployeeRecord[];
  },

  async create(input) {
    const { error } = await supabase.from("employees").insert(input);
    if (error) throw error;
  },

  async update(id, input) {
    const { error } = await supabase.from("employees").update(input).eq("id", id);
    if (error) throw error;
  },

  async remove(id) {
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) throw error;
  },
};

const segempatApiEmployees: EmployeeGateway = {
  list: () => apiRequest<EmployeeRecord[]>("/api/employees"),
  create: (input) => apiRequest<void>("/api/employees", { method: "POST", body: JSON.stringify(input) }),
  update: (id, input) => apiRequest<void>(`/api/employees/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }),
  remove: (id) => apiRequest<void>(`/api/employees/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export const employeesGateway: EmployeeGateway = {
  list: () => (isSegempatApiConfigured() ? segempatApiEmployees : legacySupabaseEmployees).list(),
  create: (input) => (isSegempatApiConfigured() ? segempatApiEmployees : legacySupabaseEmployees).create(input),
  update: (id, input) => (isSegempatApiConfigured() ? segempatApiEmployees : legacySupabaseEmployees).update(id, input),
  remove: (id) => (isSegempatApiConfigured() ? segempatApiEmployees : legacySupabaseEmployees).remove(id),
};
