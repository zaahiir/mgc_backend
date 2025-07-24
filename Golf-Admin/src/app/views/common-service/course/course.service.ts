import { Injectable } from '@angular/core';
import { BaseAPIUrl, baseURLType } from '../commom-api-url';
import axios from 'axios';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private apiUrl: string;
  private lists: string;
  private processing: string;
  private deletion: string;
  private collectionLists: string;
  private courseDetail: string;
  private searchCoursesUrl: string;
  private amenitiesLists: string;
  private amenitiesProcessing: string;
  private amenitiesDeletion: string;
  private collectionAmenities: string;

  constructor() {
    this.apiUrl = new BaseAPIUrl().getUrl(baseURLType);

    // Course Management endpoints (admin)
    this.lists = this.apiUrl + "course/0/listing/";
    this.processing = this.apiUrl + "course/0/processing/";
    this.deletion = this.apiUrl + "course/0/deletion/";

    // Collection endpoints (frontend)
    this.collectionLists = this.apiUrl + "collection/list_courses/";
    this.courseDetail = this.apiUrl + "collection/0/course_detail/";
    this.searchCoursesUrl = this.apiUrl + "collection/search/";

    // Amenities endpoints
    this.amenitiesLists = this.apiUrl + "amenities/0/listing/";
    this.amenitiesProcessing = this.apiUrl + "amenities/0/processing/";
    this.amenitiesDeletion = this.apiUrl + "amenities/0/deletion/";
    this.collectionAmenities = this.apiUrl + "amenities/collection_amenities/";
  }

  // Course Management Methods (Admin)
  listCourse(id: string = '0') {
    return axios.get(this.lists.replace('0', id));
  }

  processCourse(data: any, id: string = '0') {
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    };
    return axios.post(this.processing.replace('0', id), data, config);
  }

  deleteCourse(id: string) {
    return axios.get(this.deletion.replace('0', id));
  }

  // Collection Methods (Frontend)
  getCollectionData(legacy: boolean = false) {
    const params = legacy ? '?legacy=true' : '';
    return axios.get(`${this.collectionLists}${params}`);
  }

  getCourseDetail(id: string) {
    return axios.get(this.courseDetail.replace('0', id));
  }

  searchCoursesCollection(params: {
    q?: string;
    location?: string;
    amenities?: number[];
    legacy?: boolean;
  }) {
    const queryParams = new URLSearchParams();

    if (params.q) queryParams.append('q', params.q);
    if (params.location) queryParams.append('location', params.location);
    if (params.amenities && params.amenities.length > 0) {
      params.amenities.forEach(id => queryParams.append('amenities[]', id.toString()));
    }
    if (params.legacy) queryParams.append('legacy', 'true');

    return axios.get(`${this.searchCoursesUrl}?${queryParams.toString()}`);
  }

  // Amenities Management Methods
  listAmenities(id: string = '0') {
    return axios.get(this.amenitiesLists.replace('0', id));
  }

  processAmenities(data: any, id: string = '0') {
    return axios.post(this.amenitiesProcessing.replace('0', id), data);
  }

  deleteAmenities(id: string) {
    return axios.get(this.amenitiesDeletion.replace('0', id));
  }

  // Get amenities formatted for collection component
  getAmenities() {
    return axios.get(this.collectionAmenities);
  }

  // Convenience Methods
  getCourse(id: string) {
    return this.listCourse(id);
  }

  getAllCourses() {
    return this.listCourse('0');
  }

  getAllAmenities() {
    return this.listAmenities('0');
  }

  // Legacy method names for backward compatibility
  getCollectionCourses(legacy: boolean = false) {
    return this.getCollectionData(legacy);
  }

  searchCourses(params: {
    q?: string;
    location?: string;
    amenities?: number[];
    legacy?: boolean;
  }) {
    return this.searchCoursesCollection(params);
  }
}
