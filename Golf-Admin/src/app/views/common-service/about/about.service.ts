import { Injectable } from '@angular/core';
import { BaseAPIUrl, baseURLType } from '../commom-api-url';
import axios from 'axios';

@Injectable({
  providedIn: 'root'
})
export class AboutService {
  private apiUrl: string;
  private getAbout: string;
  private createOrUpdateAbout: string;

  constructor() {
    this.apiUrl = new BaseAPIUrl().getUrl(baseURLType);
    this.getAbout = this.apiUrl + "about/get_about/";
    this.createOrUpdateAbout = this.apiUrl + "about/create_or_update_about/";
  }

  getAboutData() {
    return axios.get(this.getAbout);
  }

  createOrUpdateAboutData(data: any) {
    return axios.post(this.createOrUpdateAbout, data);
  }

  listing(id: string = '0') {
    return axios.get(this.apiUrl + `about/listing/${id}/`);
  }

  processing(data: any, id: string = '0') {
    return axios.post(this.apiUrl + `about/processing/${id}/`, data);
  }

  deletion(id: string) {
    return axios.get(this.apiUrl + `about/deletion/${id}/`);
  }
}
