import { Injectable } from '@angular/core';
import { BaseAPIUrl, baseURLType } from '../commom-api-url';
import axios from 'axios';

@Injectable({
  providedIn: 'root'
})
export class MemberService {
  private apiUrl: string;
  private lists: string;
  private processing: string;
  private deletion: string;
  private gender: string;
  private nationality: string;
  private plan: string;

  constructor() {
    this.apiUrl = new BaseAPIUrl().getUrl(baseURLType);
    this.lists = this.apiUrl + "member/0/listing/";
    this.processing = this.apiUrl + "member/0/processing/";
    this.deletion = this.apiUrl + "member/0/deletion/";
    this.gender = this.apiUrl + "gender/";
    this.nationality = this.apiUrl + "country/";
    this.plan = this.apiUrl + "plan/";
  }

  listMember(id: string = '0') {
    return axios.get(this.lists.replace('0', id));
  }

  processMember(data: any, id: string = '0') {
    return axios.post(this.processing.replace('0', id), data);
  }

  deleteMember(id: string) {
    return axios.get(this.deletion.replace('0', id));
  }

  getGender() {
    return axios.get(this.gender);
  }

  getNationality() {
    return axios.get(this.nationality);
  }

  getPlan() {
    return axios.get(this.plan);
  }

  async getLastMemberId(year: string, month: string): Promise<string | null> {
    try {
      const response = await axios.get(`${this.apiUrl}member/last-member-id/${year}/${month}/`);
      return response.data?.data?.memberId || null;
    } catch (error) {
      console.error('Error fetching last member ID:', error);
      return null;
    }
  }

  async createSampleMembers(): Promise<any> {
    try {
      const response = await axios.post(`${this.apiUrl}member/create-sample-members/`);
      return response.data;
    } catch (error) {
      console.error('Error creating sample members:', error);
      throw error;
    }
  }
}
