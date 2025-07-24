// amenities.service.ts
import { Injectable } from '@angular/core';
import { BaseAPIUrl, baseURLType } from '../commom-api-url';
import axios from 'axios';

@Injectable({
  providedIn: 'root'
})
export class AmenitiesService {
  private apiUrl: string;
  private lists: string;
  private processing: string;
  private deletion: string;

  constructor() {
    this.apiUrl = new BaseAPIUrl().getUrl(baseURLType);
    this.lists = this.apiUrl + "amenities/0/listing/";
    this.processing = this.apiUrl + "amenities/0/processing/";
    this.deletion = this.apiUrl + "amenities/0/deletion/";
  }

  listAmenities(id: string = '0') {
    return axios.get(this.lists.replace('0', id));
  }

  processAmenities(data: any, id: string = '0') {
    return axios.post(this.processing.replace('0', id), data);
  }

  /**
   * Process amenities with SVG icon data
   * @param data - Object containing amenity data with SVG content
   * @param id - Amenity ID (0 for new, actual ID for update)
   */
  processAmenitiesWithSVG(data: any, id: string = '0') {
    return axios.post(this.processing.replace('0', id), data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  deleteAmenities(id: string) {
    return axios.get(this.deletion.replace('0', id));
  }

  /**
   * Get all amenities for frontend consumption
   */
  getAllAmenities() {
    return axios.get(this.apiUrl + "amenities/list_all/");
  }
}
