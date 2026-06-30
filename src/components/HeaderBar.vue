<template>
  <header class="header">
    <div class="logo">
      <CubeIcon class="logo-icon" />
      <span>快递查询</span>
    </div>
    <div class="header-actions">
      <button class="icon-btn" title="公告" @click="$emit('toggle-announce')">
        <MegaphoneIcon class="nav-icon" />
      </button>
      <button v-if="isLoggedIn" class="icon-btn" title="数据统计" @click="$emit('toggle-stats')">
        <ChartBarIcon class="nav-icon" />
      </button>
      <button v-if="isLoggedIn" class="icon-btn" title="设置 API 密钥" @click="$emit('toggle-settings')">
        <Cog6ToothIcon class="nav-icon" />
      </button>

      <!-- User / Login -->
      <button v-if="isLoggedIn" class="user-btn" title="已登录">
        <span class="user-email">{{ userEmail }}</span>
        <ArrowRightStartOnRectangleIcon class="nav-icon logout-hint" title="退出登录" @click.stop="$emit('logout')" />
      </button>
      <button v-else class="login-btn" title="登录/注册" @click="$emit('toggle-auth')">
        <span>登录</span>
      </button>

      <button class="avatar-btn" title="更换头像" @click="$emit('toggle-avatar')">
        <img v-if="avatarUrl" :src="avatarUrl" class="avatar-img" alt="头像" />
        <UserCircleIcon v-else class="nav-icon" />
      </button>
    </div>
  </header>
</template>

<script setup>
import { CubeIcon } from '@heroicons/vue/24/solid'
import { Cog6ToothIcon, MegaphoneIcon, UserCircleIcon, ChartBarIcon, ArrowRightStartOnRectangleIcon } from '@heroicons/vue/24/outline'

defineProps({ avatarUrl: String, isLoggedIn: Boolean, userEmail: String })
defineEmits(['toggle-settings', 'toggle-announce', 'toggle-avatar', 'toggle-stats', 'logout', 'toggle-auth'])
</script>

<style scoped>
.header {
  background: #2b2b2b; color: #fff;
  padding: 12px 16px; display: flex; align-items: center;
  justify-content: space-between; flex-shrink: 0; z-index: 10;
}
.logo { display: flex; align-items: center; gap: 8px; font-size: 17px; font-weight: 600; }
.logo-icon { width: 24px; height: 24px; color: #07c160; }
.header-actions { display: flex; gap: 6px; align-items: center; }
.icon-btn {
  background: none; border: none; cursor: pointer; padding: 4px; line-height: 1;
}
.nav-icon { width: 22px; height: 22px; color: #ccc; }
.icon-btn:hover .nav-icon { color: #fff; }

.login-btn {
  background: #07c160; border: none; border-radius: 6px; cursor: pointer;
  padding: 4px 12px; color: #fff; font-size: 13px; font-weight: 500;
}
.login-btn:hover { background: #06ad56; }

.user-btn {
  background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;
  cursor: pointer; padding: 3px 8px; display: flex; align-items: center; gap: 6px;
}
.user-btn:hover { background: rgba(255,255,255,0.18); }
.user-email { color: #ddd; font-size: 12px; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.logout-hint:hover { color: #f56c6c; }

.avatar-btn {
  background: none; border: 1px dashed rgba(255,255,255,0.25); border-radius: 6px;
  cursor: pointer; padding: 2px; line-height: 0;
  width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
  overflow: hidden; transition: border-color 0.12s;
}
.avatar-btn:hover { border-color: rgba(255,255,255,0.5); }
.avatar-btn .nav-icon { width: 20px; height: 20px; }
.avatar-btn:hover .nav-icon { color: #fff; }
.avatar-img { width: 26px; height: 26px; border-radius: 4px; object-fit: cover; }
</style>
