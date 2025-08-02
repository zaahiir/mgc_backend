import { Injectable } from '@angular/core';
import { BaseAPIUrl, baseURLType } from '../commom-api-url';
import axios from 'axios';

@Injectable({
  providedIn: 'root'
})
export class MemberTeamService {
  private apiUrl: string;
  private lists: string;
  private processing: string;
  private deletion: string;
  private activeInstructorsUrl: string;
  private activeProtocolsUrl: string;

  constructor() {
    this.apiUrl = new BaseAPIUrl().getUrl(baseURLType);
    this.lists = this.apiUrl + "instructor/0/listing/";
    this.processing = this.apiUrl + "instructor/0/processing/";
    this.deletion = this.apiUrl + "instructor/0/deletion/";
    this.activeInstructorsUrl = this.apiUrl + "instructor/active_instructors/";
    this.activeProtocolsUrl = this.apiUrl + "protocol/active_protocols/";
  }

  listInstructors(id: string = '0') {
    return axios.get(this.lists.replace('0', id));
  }

  processInstructor(data: any, id: string = '0') {
    return axios.post(this.processing.replace('0', id), data);
  }

  deleteInstructor(id: string) {
    return axios.get(this.deletion.replace('0', id));
  }

  getActiveInstructors() {
    return axios.get(this.activeInstructorsUrl);
  }

  getActiveProtocols() {
    return axios.get(this.activeProtocolsUrl);
  }
}