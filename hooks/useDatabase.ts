import { useEffect, useState } from 'react';
import { database } from '../database';
import { Q } from '@nozbe/watermelondb';
import { useAuth } from '../context/AuthContext';
import { synchronize } from '../database/sync';
import { Dive } from '../database/models/Dive';
import { Trip } from '../database/models/Trip';
import { User } from '../database/models/User';
import { Profile } from '../database/models/Profile';

interface SyncStatus {
  loading: boolean;
  message: string | null;
}

// Dive data interfaces
interface DiveData {
  diveDate: Date;
  location: string;
  depth: number;
  duration: number;
  notes?: string;
  tripId?: string;
}

interface DiveUpdateData {
  diveDate?: Date;
  location?: string;
  depth?: number;
  duration?: number;
  notes?: string;
  tripId?: string;
}

// Trip data interfaces
interface TripData {
  name: string;
  startDate: Date;
  endDate: Date;
  location: string;
  notes?: string;
}

interface TripUpdateData {
  name?: string;
  startDate?: Date;
  endDate?: Date;
  location?: string;
  notes?: string;
}

export const useDatabase = () => {
  const { user, isOnline } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    loading: false,
    message: null,
  });

  // Function to sync data
  const sync = async (): Promise<boolean> => {
    if (!user) {
      setSyncStatus({
        loading: false,
        message: 'No user logged in',
      });
      return false;
    }

    setSyncStatus({
      loading: true,
      message: 'Syncing...',
    });

    try {
      const result = await synchronize(user.id);
      setSyncStatus({
        loading: false,
        message: result.message,
      });
      return result.success;
    } catch (error: any) {
      setSyncStatus({
        loading: false,
        message: error.message || 'Sync failed',
      });
      return false;
    }
  };

  // Get collections
  const getCollection = <T extends {}>(collectionName: string) => {
    return database.get<any>(collectionName);
  };

  // Create a dive record
  const createDive = async (diveData: DiveData): Promise<Dive> => {
    if (!user) throw new Error('User not logged in');

    const divesCollection = database.get<Dive>('dives');
    let newDive!: Dive; // Non-null assertion

    await database.write(async () => {
      newDive = await divesCollection.create((dive) => {
        dive.diveDate = diveData.diveDate.getTime();
        dive.location = diveData.location;
        dive.depth = diveData.depth;
        dive.duration = diveData.duration;
        dive.notes = diveData.notes;
        dive.userId = user.id;
        dive.tripId = diveData.tripId;
        dive.isSynced = false;
      });
    });

    // Try to sync if online
    if (isOnline) {
      sync();
    }

    return newDive;
  };

  // Create a trip record
  const createTrip = async (tripData: TripData): Promise<Trip> => {
    if (!user) throw new Error('User not logged in');

    const tripsCollection = database.get<Trip>('trips');
    let newTrip!: Trip; // Non-null assertion

    await database.write(async () => {
      newTrip = await tripsCollection.create((trip) => {
        trip.name = tripData.name;
        trip.startDate = tripData.startDate.getTime();
        trip.endDate = tripData.endDate.getTime();
        trip.location = tripData.location;
        trip.notes = tripData.notes;
        trip.userId = user.id;
        trip.isSynced = false;
      });
    });

    // Try to sync if online
    if (isOnline) {
      sync();
    }

    return newTrip;
  };

  // Get dives for current user
  const getDives = async (tripId?: string): Promise<Dive[]> => {
    if (!user) return [];

    const divesCollection = database.get<Dive>('dives');

    if (tripId) {
      return await divesCollection
        .query(Q.where('user_id', user.id), Q.where('trip_id', tripId))
        .fetch();
    } else {
      return await divesCollection.query(Q.where('user_id', user.id)).fetch();
    }
  };

  // Get trips for current user
  const getTrips = async (): Promise<Trip[]> => {
    if (!user) return [];

    const tripsCollection = database.get<Trip>('trips');

    return await tripsCollection.query(Q.where('user_id', user.id)).fetch();
  };

  // Update a dive record
  const updateDive = async (
    id: string,
    diveData: DiveUpdateData
  ): Promise<Dive> => {
    const divesCollection = database.get<Dive>('dives');
    const dive = await divesCollection.find(id);

    await database.write(async () => {
      await dive.update((record) => {
        if (diveData.diveDate) record.diveDate = diveData.diveDate.getTime();
        if (diveData.location) record.location = diveData.location;
        if (diveData.depth !== undefined) record.depth = diveData.depth;
        if (diveData.duration !== undefined)
          record.duration = diveData.duration;
        if (diveData.notes !== undefined) record.notes = diveData.notes;
        if (diveData.tripId !== undefined) record.tripId = diveData.tripId;
        record.isSynced = false;
      });
    });

    // Try to sync if online
    if (isOnline) {
      sync();
    }

    return dive;
  };

  // Update a trip record
  const updateTrip = async (
    id: string,
    tripData: TripUpdateData
  ): Promise<Trip> => {
    const tripsCollection = database.get<Trip>('trips');
    const trip = await tripsCollection.find(id);

    await database.write(async () => {
      await trip.update((record) => {
        if (tripData.name) record.name = tripData.name;
        if (tripData.startDate) record.startDate = tripData.startDate.getTime();
        if (tripData.endDate) record.endDate = tripData.endDate.getTime();
        if (tripData.location) record.location = tripData.location;
        if (tripData.notes !== undefined) record.notes = tripData.notes;
        record.isSynced = false;
      });
    });

    // Try to sync if online
    if (isOnline) {
      sync();
    }

    return trip;
  };

  // Delete a dive record
  const deleteDive = async (id: string): Promise<void> => {
    const divesCollection = database.get<Dive>('dives');
    const dive = await divesCollection.find(id);

    await database.write(async () => {
      await dive.markAsDeleted();
    });

    // Try to sync if online
    if (isOnline) {
      sync();
    }
  };

  // Delete a trip record
  const deleteTrip = async (id: string): Promise<void> => {
    const tripsCollection = database.get<Trip>('trips');
    const trip = await tripsCollection.find(id);

    await database.write(async () => {
      await trip.markAsDeleted();
    });

    // Try to sync if online
    if (isOnline) {
      sync();
    }
  };

  return {
    sync,
    syncStatus,
    getCollection,
    createDive,
    createTrip,
    getDives,
    getTrips,
    updateDive,
    updateTrip,
    deleteDive,
    deleteTrip,
  };
};
