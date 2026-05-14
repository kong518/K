import { Timestamp } from 'firebase/firestore';

export interface ServiceRecord {
  id: string;
  title: string;
  content?: string;
  disabilityTypes: string[];
  completed: boolean;
  userId: string;
  userName: string;
  userPhoto?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
