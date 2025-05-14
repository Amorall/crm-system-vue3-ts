import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { getFirestore, doc, setDoc, getDoc, increment, Timestamp } from 'firebase/firestore'
import { getDownloadURL, getStorage, uploadBytes } from 'firebase/storage'

interface UserInfo {
  email: string | null
  userId: string | null
  firstName?: string | null
  lastName?: string | null
  middleName?: string | null
  jobPosition?: string | null
  gender?: string | null
  permission?: number | null
  status?: 'working' | 'vacation' | 'sick_leave'
  lastLogin?: Date | Timestamp | { seconds: number; nanoseconds?: number } | null
  loginCount?: number
  photoURL?: string
  canEditStatus?: boolean
  isAdmin?: boolean;
}

interface AuthPayload {
  email: string
  password: string
  firstName?: string
  lastName?: string
  middleName?: string
  jobPosition?: string
  gender?: string
}

const POSITION_PERMISSIONS: Record<string, number> = {
  Менеджер: 1,
  Администратор: 2,
  Директор: 3,
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

      if (type === 'signup' && payload.firstName) {
        const db = getFirestore()
        const permission = POSITION_PERMISSIONS[payload.jobPosition!] ?? 1
        await setDoc(doc(db, 'users', user.uid), {
          firstName: payload.firstName,
          lastName: payload.lastName,
          middleName: payload.middleName,
          jobPosition: payload.jobPosition,
          gender: payload.gender,
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
            isAdmin: (userDoc.data().permission || 0) >= 3,
          }
        }
      }
    } catch (err: any) {
      const errorMessage: string = err.code || 'unknown'

      switch (errorMessage) {
        case 'auth/email-already-in-use':
          error.value = 'Этот email уже зарегистрирован'
          break
        case 'auth/invalid-credential':
          error.value = 'Неверный email или пароль'
          break
        case 'auth/user-disabled':
          error.value = 'Пользователь заблокирован'
          break
        default:
          error.value = 'Произошла неизвестная ошибка. Попробуйте еще раз позже'
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

  const updateUserStatus = async (
  newStatus: 'working' | 'vacation' | 'sick_leave',
  userId: string
) => {
  try {
    const auth = getAuth()
    const currentUser = auth.currentUser
    if (!currentUser) throw new Error('Пользователь не авторизован')

    if (!canEditStatus(userId)) {
      throw new Error('Недостаточно прав для изменения статуса')
    }

    const db = getFirestore()
    await setDoc(
      doc(db, 'users', userId),
      { status: newStatus },
      { merge: true }
    )

    // Возвращаем обновленные данные
    return await loadAnyUserProfile(userId)
  } catch (err) {
    console.error('Ошибка обновления статуса:', err)
    throw err
  }
}

  const trackLogin = async () => {
    const auth = getAuth()
    const user = auth.currentUser
    if (!user) return

    const db = getFirestore()
    await setDoc(
      doc(db, 'users', user.uid),
      {
        lastLogin: new Date(),
        loginCount: increment(1),
      },
      { merge: true },
    )
  }

  const loadUserProfile = async (userId?: string) => {
  try {
    const auth = getAuth()
    const currentUser = auth.currentUser
    if (!currentUser) return

    const targetUserId = userId || currentUser.uid
    const db = getFirestore()
    const userDoc = await getDoc(doc(db, 'users', targetUserId))
    
    if (userDoc.exists()) {
      const data = userDoc.data()
      userInfo.value = {
        ...userInfo.value,
        ...data,
        isAdmin: (data.permission || 0) >= 3, // Добавляем флаг админа
        canEditStatus: canEditStatus(targetUserId)
      }
    }
  } catch (error) {
    console.error('Ошибка загрузки профиля:', error)
    throw error
  }
}

const loadAnyUserProfile = async (userId: string) => {
  try {
    const db = getFirestore();
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists()) {
      return {
        ...userDoc.data(),
        userId: userDoc.id
      };
    }
    return null;
  } catch (error) {
    console.error('Ошибка загрузки профиля:', error);
    throw error;
  }
};

const canViewProfile = (targetUserId: string) => {
  const currentUser = userInfo.value
  if (currentUser.isAdmin) return true
  return currentUser.userId === targetUserId
}
  const canEditStatus = (targetUserId: string) => {
  const currentUser = userInfo.value;
  if (currentUser.isAdmin) return true;
  return false;
};

  return {
    userInfo,
    error,
    loader,
    logout,
    auth,
    updateUserStatus,
    trackLogin,
    canViewProfile,
    canEditStatus,
    loadUserProfile,
    loadAnyUserProfile
  }
})
