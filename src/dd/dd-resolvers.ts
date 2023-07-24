import { Resolvers, MeshContext } from '../.graphclient'

export const hostedServiceDefaultURL = 'https://api.thegraph.com/subgraphs/name/zkbob/';
export const defaultSubgraphName = 'zkbob-bob-goerli';
export const defaultSubgraphEndpoint = `${hostedServiceDefaultURL}${defaultSubgraphName}`;

export const resolvers: Resolvers = {
  DirectDeposit: {
    subgraphEndpoint: (_root, _args, context, _info) => context.subgraphEndpoint || defaultSubgraphEndpoint,
  },
}