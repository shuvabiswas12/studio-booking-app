import { Injectable } from '@angular/core';
import { Studio } from '../models/studio.model';
import { studios } from '../../data/data';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class StudioService {
  private studioData: Studio[] = studios.Studios;
  private filteredStudios = new BehaviorSubject<Studio[]>(this.studioData);

  constructor() {}

  getStudios(): Observable<Studio[]> {
    return of(this.studioData);
  }

  getFilteredStudios(): Observable<Studio[]> {
    return this.filteredStudios.asObservable();
  }

  searchByArea(area: string): void {
    if (!area) {
      this.filteredStudios.next(this.studioData);
      return;
    }

    const filtered = this.studioData.filter((studio) =>
      studio.Location.Area.toLowerCase().includes(area.toLowerCase())
    );
    this.filteredStudios.next(filtered);
  }

  searchByRadius(latitude: number, longitude: number, radius: number): void {
    const filtered = this.studioData.filter((studio) => {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        studio.Location.Coordinates.Latitude,
        studio.Location.Coordinates.Longitude
      );
      return distance <= radius;
    });
    this.filteredStudios.next(filtered);
  }

  resetFilters(): void {
    this.filteredStudios.next(this.studioData);
  }

  getStudioById(id: number): Observable<Studio | undefined> {
    return of(this.studioData.find((studio) => studio.Id === id));
  }

  getUniqueAreas(): Observable<string[]> {
    const areas = new Set<string>();
    this.studioData.forEach((studio) => {
      areas.add(studio.Location.Area);
    });
    return of(Array.from(areas));
  }

  // Calculate distance between two points using the Haversine formula
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
