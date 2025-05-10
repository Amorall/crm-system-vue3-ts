import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'

interface UserInfo {
  email: string | null
  userId: string | null
  firstName?: string | null
  lastName?: string | null
  middleName?: string | null
  jobPosition?: string | null
  gender?: string | null
  permission?: number | null
}

interface AuthPayload {
  email: string
  password: string
  firstName: string
  lastName: string
  middleName: string
  jobPosition: string
  gender: string
}

const POSITION_PERMISSIONS: Record<string, number> = {
  Менеджер: 1,
  Администратор: 2,
}

export const useAuthStore = defineStore('auth', () => {
  const userInfo = ref<UserInfo>({ email: null, userId: null })
  const error = ref<string>('')
  const loader = ref<boolean>(false)

  const auth = async (payload: AuthPayload, type: 'signup' | 'signin') => {
    error.value = ''
    loader.value = true

    try {
      const authInstance = getAuth()
      const userCredential =
        type === 'signup'
          ? await createUserWithEmailAndPassword(authInstance, payload.email, payload.password)
          : await signInWithEmailAndPassword(authInstance, payload.email, payload.password)

      const user = userCredential.user

      // Если это регистрация, сохраняем доп. данные в Firestore
      if (type === 'signup' && payload.firstName) {
        const db = getFirestore()
        const permission = POSITION_PERMISSIONS[payload.jobPosition] ?? 1
        await setDoc(doc(db, 'users', user.uid), {
          firstName: payload.firstName,
          lastName: payload.lastName,
          middleName: payload.middleName,
          jobPosition: payload.jobPosition,
          gender: payload.gender,
          incomeValue: '0',
          permission: permission,
        })

        userInfo.value = {
          email: user.email,
          userId: user.uid,
          jobPosition: payload.jobPosition,
          firstName: payload.firstName,
          lastName: payload.lastName,
          middleName: payload.middleName,
        }
      } else {
        // Для входа загружаем дополнительные данные
        const db = getFirestore()
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          userInfo.value = {
            email: user.email,
            userId: user.uid,
            ...userDoc.data(),
          }
        }
      }
    } catch (err: any) {
      const errorMessage: string = err.code || 'unknown'

      switch (errorMessage) {
        case 'auth/email-already-in-use':
          error.value = 'Этот email уже зарегистрирован'
          break
        case 'auth/invalid-credentials':
          error.value = 'Неверный email или пароль'
          break
        case 'auth/user-disabled':
          error.value = 'Пользователь заблокирован'
          break
        default:
          error.value = err
          break
      }
      throw new Error(error.value)
    } finally {
      loader.value = false
    }
  }

  const logout = async (): Promise<void> => {
    loader.value = true
    error.value = ''
    try {
      const auth = getAuth()
      await signOut(auth)

      userInfo.value = { email: null, userId: null }
    } catch (err: any) {
      error.value = err.message || 'Произошла ошибка при выходе'
    } finally {
      loader.value = false
    }
  }

  return { auth, userInfo, error, loader, logout }
})
