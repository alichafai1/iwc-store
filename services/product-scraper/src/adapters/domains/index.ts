import { AllReplicaWatchesAdapter } from './allreplicawatches.js';
import { ReplicaisAdapter } from './replicais.js';
import type { CollectionAdapter, ProductAdapter } from '../types.js';

const replicais = new ReplicaisAdapter();
const allReplicaWatches = new AllReplicaWatchesAdapter();

export const domainAdapters: ProductAdapter[] = [replicais, allReplicaWatches];
export const collectionAdapters: CollectionAdapter[] = [replicais, allReplicaWatches];
