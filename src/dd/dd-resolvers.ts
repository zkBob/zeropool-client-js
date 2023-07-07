import { Resolvers, MeshContext } from '../.graphclient'

export const resolvers: Resolvers = {
  DirectDeposit: {
    subgraphName: (root, args, context, info) => context.subgraphName || 'zkbob-bob-goerli', // The value we provide in the config
  },
}