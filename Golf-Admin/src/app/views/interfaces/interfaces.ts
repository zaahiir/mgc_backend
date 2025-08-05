export interface userTypeMasterCommonInterface {
  id: number,
  userTypeName: string,
  hideStatus: number,
  createdAt: string,
  updatedAt: string,
}



export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

