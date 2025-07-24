export interface userTypeMasterCommonInterface {
  id: number,
  userTypeName: string,
  hideStatus: number,
  createdAt: string,
  updatedAt: string,
}

export interface PlanType {
  id: number;
  planTypeName: string;
  hideStatus?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanDuration {
  id: number;
  planDurationName: string;
  hideStatus?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanCycle {
  id: number;
  planCycleName: string;
  hideStatus?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

