import { Injectable } from '@angular/core';
import { BaseAPIUrl, baseURLType } from '../commom-api-url';
import axios from 'axios';

@Injectable({
  providedIn: 'root'
})
export class PlanService {
  private apiUrl: string;
  private lists: string;
  private processing: string;
  private deletion: string;
  private planTypes: string;
  private planDurations: string;
  private planCycles: string;

  constructor() {
    this.apiUrl = new BaseAPIUrl().getUrl(baseURLType);
    this.lists = this.apiUrl + "plan/0/listing/";
    this.processing = this.apiUrl + "plan/0/processing/";
    this.deletion = this.apiUrl + "plan/0/deletion/";
    this.planTypes = this.apiUrl + "planType/";
    this.planDurations = this.apiUrl + "planDuration/";
    this.planCycles = this.apiUrl + "planCycle/";
  }

  listPlan(id: string = '0') {
    return axios.get(this.lists.replace('0', id));
  }

  processPlan(data: any, id: string = '0') {
    return axios.post(this.processing.replace('0', id), data);
  }

  deletePlan(id: string) {
    return axios.get(this.deletion.replace('0', id));
  }

  getPlanTypes() {
    return axios.get(this.planTypes);
  }

  getPlanDurations() {
    return axios.get(this.planDurations);
  }

  getPlanCycles() {
    return axios.get(this.planCycles);
  }
}
