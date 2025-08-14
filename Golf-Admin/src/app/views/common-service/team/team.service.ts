import { Injectable } from '@angular/core';
import { BaseAPIUrl, baseURLType } from '../commom-api-url';
import axios from 'axios';

export interface ProtocolData {
  id?: number;
  protocolTitle: string;
  protocolDescription: string;
  hideStatus?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface InstructorData {
  id?: number;
  instructorName: string;
  instructorPosition: string;
  instructorPhoto?: File | null;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  hideStatus?: number;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private apiUrl: string;
  private lists: string;
  private processing: string;
  private deletion: string;

  constructor() {
    this.apiUrl = new BaseAPIUrl().getUrl(baseURLType);
    this.lists = this.apiUrl + "protocol/0/listing/";
    this.processing = this.apiUrl + "protocol/0/processing/";
    this.deletion = this.apiUrl + "protocol/0/deletion/";
  }

  // Protocol methods
  listProtocol(id: string = '0') {
    return axios.get(this.lists.replace('0', id));
  }

  processProtocol(data: FormData | ProtocolData, id: string = '0') {
    // If data is FormData, send it directly
    if (data instanceof FormData) {
      // Don't set Content-Type header for FormData - let the browser set it with boundary
      return axios.post(this.processing.replace('0', id), data);
    }
    // If data is a plain object, convert to FormData
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
        formData.append(key, data[key]);
      }
    });
    return axios.post(this.processing.replace('0', id), formData);
  }

  deleteProtocol(id: string) {
    return axios.get(this.deletion.replace('0', id));
  }

  getActiveProtocols() {
    return axios.get(this.apiUrl + "protocol/active_protocols/");
  }

  getAllProtocols() {
    return axios.get(this.apiUrl + "protocol/0/listing/");
  }

  // Instructor methods
  listInstructor(id: string = '0') {
    return axios.get(this.apiUrl + `instructor/${id}/listing/`);
  }

  processInstructor(data: FormData | InstructorData, id: string = '0') {
    // If data is FormData, send it directly
    if (data instanceof FormData) {
      // Don't set Content-Type header for FormData - let the browser set it with boundary
      return axios.post(this.apiUrl + `instructor/${id}/processing/`, data);
    }
    // If data is a plain object, convert to FormData
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
        if (key === 'instructorPhoto' && data[key] instanceof File) {
          formData.append(key, data[key] as File);
        } else {
          formData.append(key, data[key]);
        }
      }
    });
    return axios.post(this.apiUrl + `instructor/${id}/processing/`, formData);
  }

  deleteInstructor(id: string) {
    return axios.get(this.apiUrl + `instructor/${id}/deletion/`);
  }

  getActiveInstructors() {
    return axios.get(this.apiUrl + "instructor/active_instructors/");
  }

  getAllInstructors() {
    return axios.get(this.apiUrl + "instructor/0/listing/");
  }
}

