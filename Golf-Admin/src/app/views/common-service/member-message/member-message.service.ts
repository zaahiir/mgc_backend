import { Injectable } from '@angular/core';
import { BaseAPIUrl, baseURLType } from '../commom-api-url';
import axios from 'axios';

@Injectable({
  providedIn: 'root'
})
export class MemberMessageService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = new BaseAPIUrl().getUrl(baseURLType);
  }

  listMemberMessage(id: string = '0') {
    const url = `${this.apiUrl}message/listing/${id}/`;
    return axios.get(url);
  }

  processMemberMessage(data: any, id: string = '0') {
    const url = `${this.apiUrl}message/processing/${id}/`;
    return axios.post(url, data);
  }

  deleteMemberMessage(id: string) {
    const url = `${this.apiUrl}message/deletion/${id}/`;
    return axios.get(url);
  }

  markMessageAsRead(id: string) {
    const url = `${this.apiUrl}message/mark_as_read/${id}/`;
    return axios.post(url);
  }

  markMessageAsReplied(id: string) {
    const url = `${this.apiUrl}message/mark_as_replied/${id}/`;
    return axios.post(url);
  }

  markMessageAsClosed(id: string) {
    const url = `${this.apiUrl}message/mark_as_closed/${id}/`;
    return axios.post(url);
  }

  getNewMessages() {
    const url = `${this.apiUrl}message/new_messages/`;
    return axios.get(url);
  }

  async getMessageById(messageId: string): Promise<any> {
    try {
      const url = `${this.apiUrl}message/listing/${messageId}/`;
      console.log('Getting message by ID:', url);

      const response = await axios.get(url, {
        timeout: 30000
      });

      console.log('Get message response:', response);
      return response;
    } catch (error) {
      console.error('Error getting message by ID:', error);
      throw error;
    }
  }
}
