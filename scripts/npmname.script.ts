/*

DEBUG=nc* yarn tsn npmname

 */

import { runScript } from '@naturalcycles/nodejs-lib/dist/script'
import * as checkNpmName from 'npm-name'

runScript(async () => {
  const r = await checkNpmName('@kg/watchify')
  console.log(r)
})
