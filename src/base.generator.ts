import {
  AnySchemaTyped,
  convert,
  getValidationResult,
  stringSchema,
} from '@naturalcycles/nodejs-lib'
import _ = require('lodash')
import * as checkNpmName from 'npm-name'
import * as Generator from 'yeoman-generator'

export interface BaseOptions {
  skipQuestions?: boolean
  skipInstall?: boolean
}

export interface BaseAnswers1 {
  npmName: string
}

export interface BaseAnswers2 {
  githubOrg: string
  githubRepoName: string
  moduleAuthor: string
}

export interface BaseAnswers extends BaseAnswers1, BaseAnswers2 {
  npmScope?: string
  npmNameWithoutScope: string
  githubFullName: string
}

export const githubOrgSchema = stringSchema
  .min(1)
  .max(80)
  .alphanum()
export const githubRepoSchema = stringSchema
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9-_]*$/)
export const notEmptyStringSchema = stringSchema

export class BaseGenerator extends Generator {
  constructor(args: any, opts: any) {
    super(args, opts)

    this.option('skipQuestions', {
      type: Boolean,
    })

    this.option('skipInstall', {
      type: Boolean,
    })
  }

  baseAnswers!: BaseAnswers

  async _logVersion(projectDir: string): Promise<void> {
    const { version, name } = require(`${projectDir}/package.json`)
    this.log(`\n\n${name}@${version}\n\n`)
  }

  async _getBaseAnswers(): Promise<BaseAnswers> {
    const answers1 = await this.prompt<BaseAnswers1>([
      {
        name: 'npmName',
        message: 'npm project name (including scope, if needed, e.g @angular/builder)',
        default: _.kebabCase(this.appname), // Default to current folder name
        validate: async (npmName: any) => {
          const avail = await checkNpmName(npmName).catch(err => {
            console.log(err)
            return false
          })

          if (!avail) {
            return `${npmName} npm package is not available (taken or invalid)`
          }

          return true
        },
        store: true,
      },
    ])

    const { npmNameWithoutScope, npmScope } = parseNpmName(answers1.npmName)

    const answers2 = await this.prompt<BaseAnswers2>([
      {
        name: 'githubOrg',
        message: 'GitHub Org / Author, e.g `NaturalCycles`',
        default: 'NaturalCycles',
        filter: str => convert(str, githubOrgSchema),
        validate: (str: any) => inquirerValid(str, githubOrgSchema),
        store: true,
      },
      {
        name: 'githubRepoName',
        message: 'Repo name on Github (excluding Org name)',
        default: npmNameWithoutScope,
        filter: str => convert(str, githubRepoSchema),
        validate: (str: any) => inquirerValid(str, githubRepoSchema),
        store: true,
      },
      {
        name: 'moduleAuthor',
        message: 'package.json author',
        default: 'Natural Cycles Team',
        filter: str => convert(str, notEmptyStringSchema),
        validate: (str: any) => inquirerValid(str, notEmptyStringSchema),
        store: true,
      },
    ])

    const githubFullName = [answers2.githubOrg, answers2.githubRepoName].join('/')

    this.baseAnswers = {
      ...answers1,
      ...answers2,
      npmScope,
      npmNameWithoutScope,
      githubFullName,
    }

    return this.baseAnswers
  }

  async _setupGit(): Promise<void> {
    const { githubFullName } = this.baseAnswers

    const cmd = [
      `git init`,
      `git remote add origin git@github.com:${githubFullName}.git`,
      `git add -A`,
      `git commit -a -m "feat: first version"`,
      `git status`,
    ].join(' && ')

    await this.spawnCommandSync(cmd, [], { shell: true })
  }
}

export function inquirerValid(value: any, schema: AnySchemaTyped<any>): true | string {
  const { error } = getValidationResult(value, schema)
  return error ? error.message : true
}

export function parseNpmName(npmName: string): { npmScope?: string; npmNameWithoutScope: string } {
  const [npmNameWithoutScope, npmScope] = npmName.split('/').reverse()
  return {
    npmScope,
    npmNameWithoutScope,
  }
}
