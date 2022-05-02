import { BuildContext, BuiltTaskResult, BuildTask, TaskResultsList } from '@teambit/builder';
import { Capsule } from '@teambit/isolator';
import { hardLinkDirectory } from '@teambit/toolbox.fs.hard-link-directory';
import { DependencyResolverMain } from '@teambit/dependency-resolver';
import fs from 'fs-extra';
import path from 'path';

import { Compiler } from './types';

/**
 * compiler build task. Allows to compile components during component build.
 */
export class CompilerTask implements BuildTask {
  readonly description = 'compile components';
  constructor(
    readonly aspectId: string,
    readonly name: string,
    private compilerInstance: Compiler,
    private dependencyResolver: DependencyResolverMain
  ) {
    if (compilerInstance.artifactName) {
      this.description += ` for artifact ${compilerInstance.artifactName}`;
    }
  }

  async preBuild(context: BuildContext) {
    await Promise.all(
      context.capsuleNetwork.seedersCapsules.map((capsule) =>
        this.copyNonSupportedFiles(capsule, this.compilerInstance)
      )
    );
    if (!this.compilerInstance.preBuild) return;
    await this.compilerInstance.preBuild(context);
  }

  async execute(context: BuildContext): Promise<BuiltTaskResult> {
    const buildResults = await this.compilerInstance.build(context);
    await this._syncCapsules(context);
    return buildResults;
  }

  /**
   * This function copies the compiled artifacts to the `node_modules` of other component capsules.
   * For instance, if we have a `button` component that is a dependency of the `card` component,
   * then the `dist` folder of the `button` component will be copied to `<card_capsule>/node_modules/button/dist`.
   */
  private async _syncCapsules(context: BuildContext): Promise<void> {
    await Promise.all(
      context.capsuleNetwork.seedersCapsules.map(async (capsule) => {
        const relCompDir = path.relative(context.capsuleNetwork.capsulesRootDir, capsule.path).replace(/\\/g, '/');
        const injectedDirs = await this.dependencyResolver.getInjectedDirs(
          context.capsuleNetwork.capsulesRootDir,
          relCompDir,
          this.dependencyResolver.getPackageName(capsule.component)
        );
        return hardLinkDirectory(
          capsule.path,
          injectedDirs.map((injectedDir) => path.join(context.capsuleNetwork.capsulesRootDir, injectedDir))
        );
      })
    );
  }

  async postBuild?(context: BuildContext, tasksResults: TaskResultsList): Promise<void> {
    if (!this.compilerInstance.postBuild) return;
    await this.compilerInstance.postBuild(context, tasksResults);
  }

  async copyNonSupportedFiles(capsule: Capsule, compiler: Compiler) {
    if (!compiler.shouldCopyNonSupportedFiles) {
      return;
    }
    const component = capsule.component;
    await Promise.all(
      component.filesystem.files.map(async (file) => {
        if (compiler.isFileSupported(file.path)) return;
        const content = file.contents;
        await fs.outputFile(path.join(capsule.path, compiler.distDir, file.relative), content);
      })
    );
  }
}
