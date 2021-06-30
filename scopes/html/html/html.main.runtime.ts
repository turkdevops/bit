import { TsConfigSourceFile } from 'typescript';
import { merge } from 'lodash';
import type { TsCompilerOptionsWithoutTsConfig } from '@teambit/typescript';
import { BuildTask } from '@teambit/builder';
import { Compiler } from '@teambit/compiler';
import { PackageJsonProps } from '@teambit/pkg';
import { VariantPolicyConfigObject } from '@teambit/dependency-resolver';
import { MainRuntime } from '@teambit/cli';
import { EnvsAspect, EnvsMain, EnvTransformer } from '@teambit/envs';
import { ReactAspect, ReactMain } from '@teambit/react';
import { GeneratorAspect, GeneratorMain } from '@teambit/generator';
import { htmlEnvTemplate } from './templates/html-env';
import { HtmlAspect } from './html.aspect';
import { HtmlEnv } from './html.env';

export class HtmlMain {
  constructor(
    private react: ReactMain,

    readonly htmlEnv: HtmlEnv,

    private envs: EnvsMain
  ){}
  static slots = [];
  static dependencies = [EnvsAspect, ReactAspect, GeneratorAspect];
  static runtime = MainRuntime;

/**
   * override the TS config of the environment.
   */
  overrideTsConfig: (
    tsconfig: TsConfigSourceFile,
    compilerOptions?: Partial<TsCompilerOptionsWithoutTsConfig>,
    tsModule?: any
  ) => EnvTransformer = this.react.overrideTsConfig.bind(this.react);

  /**
   * override the jest config of the environment.
   */
  overrideJestConfig = this.react.overrideJestConfig.bind(this.react);

  /**
   * override the env build pipeline.
   */
  overrideBuildPipe: (tasks: BuildTask[]) => EnvTransformer = this.react.overrideBuildPipe.bind(this.react);

  /**
   * override the env compilers list.
   */
  overrideCompiler: (compiler: Compiler) => EnvTransformer = this.react.overrideCompiler.bind(this.react);

  /**
   * override the env compilers tasks in the build pipe.
   */
  overrideCompilerTasks: (tasks: BuildTask[]) => EnvTransformer = this.react.overrideCompilerTasks.bind(this.react);

  /**
   * override the build ts config.
   */
  overrideBuildTsConfig: (
    tsconfig: any,
    compilerOptions?: Partial<TsCompilerOptionsWithoutTsConfig>
  ) => EnvTransformer = this.react.overrideBuildTsConfig.bind(this.react);

  /**
   * override package json properties.
   */
  overridePackageJsonProps: (props: PackageJsonProps) => EnvTransformer = this.react.overridePackageJsonProps.bind(
    this.react
  );

  /**
   * @deprecated - use useWebpack
   * override the preview config in the env.
   */
  overridePreviewConfig = this.react.overridePreviewConfig.bind(this.react);

  /**
   * @deprecated - use useWebpack
   * override the dev server configuration.
   */
  overrideDevServerConfig = this.react.overrideDevServerConfig.bind(this.react);

  /**
   * override the env's dev server and preview webpack configurations.
   * Replaces both overrideDevServerConfig and overridePreviewConfig
   */
  useWebpack = this.react.useWebpack.bind(this.react);

  /**
   * override the dependency configuration of the component environment.
   */
  overrideDependencies(dependencyPolicy: VariantPolicyConfigObject) {
    return this.envs.override({
      getDependencies: () => merge(dependencyPolicy, this.htmlEnv.getDependencies()),
    });
  }

  static async provider([envs, react, generator]: [EnvsMain, ReactMain, GeneratorMain]) {
    const htmlEnv: HtmlEnv = envs.merge(new HtmlEnv(), react.reactEnv);
    envs.registerEnv(htmlEnv);
    generator.registerComponentTemplate([htmlEnvTemplate]);
  return new HtmlMain(react, htmlEnv, envs);
  }
}

HtmlAspect.addRuntime(HtmlMain);
