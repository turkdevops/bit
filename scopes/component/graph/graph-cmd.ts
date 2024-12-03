import chalk from 'chalk';
import os from 'os';
import * as path from 'path';
import GraphLib from 'graphlib';
import { Command, CommandOptions } from '@teambit/cli';
import { ComponentID } from '@teambit/component-id';
import { generateRandomStr } from '@teambit/toolbox.string.random';
import { Consumer, loadConsumerIfExist } from '@teambit/legacy/dist/consumer';
import { DependencyGraph, VisualDependencyGraph } from '@teambit/legacy.dependency-graph';
import { ConsumerNotFound } from '@teambit/legacy/dist/consumer/exceptions';
import getRemoteByName from '@teambit/legacy/dist/remotes/get-remote-by-name';
import { ComponentMain } from '@teambit/component';

type GraphOpt = {
  image?: string;
  remote?: string;
  allVersions?: boolean;
  layout?: string;
  json?: boolean;
};

export class GraphCmd implements Command {
  name = 'graph [id]';
  description = "generate an image file with the workspace components' dependencies graph";
  extendedDescription: 'black arrow is a runtime dependency. red arrow is either dev or peer';
  group = 'discover';
  alias = '';
  options = [
    ['i', 'image <image>', 'image path and format. use one of the following extensions: [gif, png, svg, pdf]'],
    ['r', 'remote [remoteName]', 'remote name (name is optional, leave empty when id is specified)'],
    ['', 'all-versions', 'enter all components versions into the graph, not only latest'],
    [
      '',
      'layout <name>',
      'GraphVis layout. default to "dot". options are [circo, dot, fdp, neato, osage, patchwork, sfdp, twopi]',
    ],
    ['j', 'json', 'json format'],
  ] as CommandOptions;
  remoteOp = true;

  constructor(private componentAspect: ComponentMain) {}

  async report([id]: [string], { remote, allVersions, layout, image }: GraphOpt): Promise<string> {
    const consumer = await loadConsumerIfExist();
    if (!consumer && !remote) throw new ConsumerNotFound();

    const graph = await this.generateGraph(consumer, id, remote, allVersions);

    const config = {};
    // @ts-ignore AUTO-ADDED-AFTER-MIGRATION-PLEASE-FIX!
    if (layout) config.layout = layout;
    const visualDependencyGraph = await VisualDependencyGraph.loadFromGraphlib(graph, config);

    image = image || path.join(os.tmpdir(), `${generateRandomStr()}.png`);
    const result = await visualDependencyGraph.image(image);

    return chalk.green(`image created at ${result}`);
  }

  private async generateGraph(
    consumer?: Consumer,
    id?: string,
    remote?: string,
    allVersions?: boolean
  ): Promise<GraphLib.Graph> {
    if (!consumer && !remote) throw new ConsumerNotFound();
    const getBitId = (): ComponentID | undefined => {
      if (!id) return undefined;
      if (remote) return ComponentID.fromString(id); // user used --remote so we know it has a scope
      // @ts-ignore AUTO-ADDED-AFTER-MIGRATION-PLEASE-FIX!
      return consumer.getParsedId(id);
    };
    const bitId = getBitId();
    if (remote) {
      if (id) {
        // @ts-ignore scope must be set as it came from a remote
        const scopeName: string = typeof remote === 'string' ? remote : bitId.scope;
        const remoteScope = await getRemoteByName(scopeName, consumer);
        const componentDepGraph = await remoteScope.graph(bitId);
        return componentDepGraph.graph;
      }
      if (typeof remote !== 'string') {
        throw new Error('please specify remote scope name or enter an id');
      }
      const remoteScope = await getRemoteByName(remote, consumer);
      const componentDepGraph = await remoteScope.graph();
      return componentDepGraph.graph;
    }

    const onlyLatest = !allVersions;
    // @ts-ignore consumer must be set here
    const workspaceGraph = await DependencyGraph.buildGraphFromWorkspace(consumer, onlyLatest);
    const dependencyGraph = new DependencyGraph(workspaceGraph);
    if (id) {
      // @ts-ignore AUTO-ADDED-AFTER-MIGRATION-PLEASE-FIX!
      const componentGraph = dependencyGraph.getSubGraphOfConnectedComponents(bitId);
      const componentDepGraph = new DependencyGraph(componentGraph);
      return componentDepGraph.graph;
    }
    return dependencyGraph.graph;
  }

  async json([id]: [string], { remote, allVersions }: GraphOpt) {
    const consumer = await loadConsumerIfExist();
    if (!consumer && !remote) throw new ConsumerNotFound();

    const graph = await this.generateGraph(consumer, id, remote, allVersions);
    return GraphLib.json.write(graph);
  }
}
