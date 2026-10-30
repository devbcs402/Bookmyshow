import { create } from 'zustand';
import { STORAGE_KEYS, DEFAULT_CITY } from '../constants';
import theatresApi from '../services/api/theatres.api';

const getInitialCity = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_CITY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (_e) {}
  return DEFAULT_CITY;
};

export const useCityStore = create((set, get) => ({
  currentCity: getInitialCity(),
  availableCities: [
    DEFAULT_CITY,
    { _id: 'city-delhi', name: 'Delhi-NCR', state: 'Delhi', code: 'DEL' },
    { _id: 'city-bengaluru', name: 'Bengaluru', state: 'Karnataka', code: 'BLR' },
    { _id: 'city-hyderabad', name: 'Hyderabad', state: 'Telangana', code: 'HYD' },
    { _id: 'city-chennai', name: 'Chennai', state: 'Tamil Nadu', code: 'MAA' },
    { _id: 'city-pune', name: 'Pune', state: 'Maharashtra', code: 'PNQ' },
    { _id: 'city-kolkata', name: 'Kolkata', state: 'West Bengal', code: 'CCU' },
    { _id: 'city-ahmedabad', name: 'Ahmedabad', state: 'Gujarat', code: 'AMD' }
  ],
  isLoadingCities: false,

  fetchCities: async () => {
    try {
      set({ isLoadingCities: true });
      const res = await theatresApi.getCities();
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        set({ availableCities: res.data });
        // If current city is not in the list, set to first available
        const current = get().currentCity;
        const exists = res.data.some(c => c._id === current._id || c.name.toLowerCase() === current.name.toLowerCase());
        if (!exists) {
          get().setCity(res.data[0]);
        }
      }
    } catch (_err) {
      // Retain fallback cities
    } finally {
      set({ isLoadingCities: false });
    }
  },

  setCity: city => {
    set({ currentCity: city });
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_CITY, JSON.stringify(city));
      window.dispatchEvent(new CustomEvent('bms:city:changed', { detail: city }));
    } catch (_e) {}
  }
}));

export default useCityStore;

