import { ref, onMounted } from 'vue'

const AVATAR_KEY = 'user_avatar'

export function useAvatar() {
  const avatar = ref('')

  onMounted(() => {
    try { avatar.value = localStorage.getItem(AVATAR_KEY) || '' } catch {}
  })

  function saveAvatar(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) return reject(new Error('请选择图片文件'))
      if (file.size > 2 * 1024 * 1024) return reject(new Error('图片不能超过 2MB'))

      const reader = new FileReader()
      reader.onload = () => {
        avatar.value = reader.result
        try { localStorage.setItem(AVATAR_KEY, reader.result) } catch {}
        resolve(reader.result)
      }
      reader.onerror = () => reject(new Error('读取图片失败'))
      reader.readAsDataURL(file)
    })
  }

  function clearAvatar() {
    avatar.value = ''
    try { localStorage.removeItem(AVATAR_KEY) } catch {}
  }

  return { avatar, saveAvatar, clearAvatar }
}
