// concept.service.ts
import { Injectable } from '@angular/core';
import { BaseAPIUrl, baseURLType } from '../commom-api-url';
import axios from 'axios';

export interface ConceptItem {
  id?: number;
  heading: string;
  paragraph: string;
  order: number;
  hideStatus?: number;
}

export interface ConceptData {
  id?: number;
  conceptHighlight: string;
  conceptCount: number;
  items: ConceptItem[];
  hideStatus?: number;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConceptService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = new BaseAPIUrl().getUrl(baseURLType);
  }

  // Get concept data
  getConcept() {
    return axios.get(`${this.apiUrl}concept/get_concept/`);
  }

  // List concept (alias for getConcept for backward compatibility)
  listConcept() {
    return this.getConcept();
  }

  // Create or Update concept
  createOrUpdateConcept(data: ConceptData) {
    return axios.post(`${this.apiUrl}concept/create_or_update_concept/`, data);
  }

  // Process concept (alias for createOrUpdateConcept for backward compatibility)
  processConcept(data: ConceptData) {
    return this.createOrUpdateConcept(data);
  }

  // Delete entire concept
  deleteConcept() {
    return axios.delete(`${this.apiUrl}concept/delete_concept/`);
  }

  // Delete specific concept item
  deleteConceptItem(itemId: number) {
    return axios.delete(`${this.apiUrl}concept/1/delete_item/`, {
      data: { item_id: itemId }
    });
  }
}
