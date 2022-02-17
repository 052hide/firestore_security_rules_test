import { readFileSync } from 'fs'
import { v4 } from 'uuid'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const projectId = v4()
let testEnv
const uid = v4()
const companyUid = v4()

const getDB = () => {
  // 未認証
  const unauthenticatedContext = testEnv.unauthenticatedContext()
  const guestClientDB = unauthenticatedContext.firestore()

  // 認証済
  const authenticatedContext = testEnv.authenticatedContext(uid)
  const authenticatedClientDB = authenticatedContext.firestore()

  // 認証済スタッフ
  const staffContext = testEnv.authenticatedContext(uid, { isStaff: true } )
  const staffClientDB = staffContext.firestore()

  // 認証済スタッフ カスタムクレームにcompanyUidが存在する
  const hasCompanyContext = testEnv.authenticatedContext(uid, { isStaff: true, companyId: companyUid })
  const hasCompanyClientDB = hasCompanyContext.firestore()

  return {
    guestClientDB,
    authenticatedClientDB,
    staffClientDB,
    hasCompanyContext,
    hasCompanyClientDB
  }
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      port: 8080,
      host: 'localhost'
    }
  })
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await setDoc(doc(getDB().hasCompanyClientDB, '/staffs', uid), {
    userId: v4()
  })
  await setDoc(doc(getDB().hasCompanyClientDB, '/companies', companyUid), {
    name: '会社'
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

describe('get', () => {
  describe('companies', () => {
    it('未認証: NG', async () => {
      const { guestClientDB } = getDB();
      await assertFails(getDoc(doc(guestClientDB, '/companies', companyUid)))
    })

    it('スタッフじゃない: NG', async () => {
      const { authenticatedClientDB } = getDB();
      await assertFails(getDoc(doc(authenticatedClientDB, '/companies', companyUid)))
    })

    it('Custom Claimに会社が存在しない: NG', async () => {
      const { staffClientDB } = getDB();
      await assertFails(getDoc(doc(staffClientDB, '/companies', companyUid)))
    })

    it('Custom Claimに会社が存在する: OK', async () => {
      const { hasCompanyClientDB } = getDB();
      await assertSucceeds(getDoc(doc(hasCompanyClientDB, '/companies', companyUid)))
    })
  })
})