import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useForm } from '../../hooks/useForm'
import { PageHeader, Card, CardHeader, CardBody, Button, Input, Alert, Badge } from '../../components/ui'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { User, Lock, Shield } from 'lucide-react'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [profileError, setProfileError] = useState('')
  const [passError, setPassError] = useState('')

  const profile = useForm({ name: user?.name || '' })
  const password = useForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' })

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setProfileError('')
    profile.setLoading(true)
    try {
      const { data } = await api.put('/profile', { name: profile.values.name })
      updateUser({ name: data.data.user.name })
      toast.success('Profile updated.')
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update profile.'
      const errs = err.response?.data?.errors
      if (errs) profile.setApiErrors(errs)
      else setProfileError(msg)
    } finally {
      profile.setLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPassError('')
    password.setLoading(true)
    try {
      await api.post('/profile/change-password', {
        currentPassword: password.values.currentPassword,
        newPassword: password.values.newPassword,
        confirmNewPassword: password.values.confirmNewPassword,
      })
      toast.success('Password changed successfully.')
      password.reset()
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password.'
      const errs = err.response?.data?.errors
      if (errs) password.setApiErrors(errs)
      else setPassError(msg)
    } finally {
      password.setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="My Profile"
        description="Manage your account details and security settings."
      />

      <div className="space-y-5">
        {/* Account info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User size={16} className="text-slate-500" />
              <h2 className="font-semibold text-slate-800">Account Information</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-xl font-bold text-primary-700">
                  {user?.name?.[0]?.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-slate-900">{user?.name}</p>
                <p className="text-sm text-slate-500">{user?.email}</p>
                <div className="flex gap-2 mt-1.5">
                  <Badge variant="blue">{user?.role}</Badge>
                  <Badge variant={user?.status === 'ACTIVE' ? 'green' : 'gray'}>{user?.status}</Badge>
                </div>
              </div>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-4">
              {profileError && <Alert type="error">{profileError}</Alert>}
              <Input
                label="Full name"
                type="text"
                name="name"
                value={profile.values.name}
                onChange={profile.handleChange}
                error={profile.errors.name}
              />
              <Input
                label="Email address"
                type="email"
                value={user?.email || ''}
                disabled
                hint="Email cannot be changed in this phase."
              />
              <Button type="submit" variant="primary" loading={profile.loading}>
                Save Changes
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Change password */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-slate-500" />
              <h2 className="font-semibold text-slate-800">Change Password</h2>
            </div>
          </CardHeader>
          <CardBody>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {passError && <Alert type="error">{passError}</Alert>}
              <Input
                label="Current password"
                type="password"
                name="currentPassword"
                value={password.values.currentPassword}
                onChange={password.handleChange}
                error={password.errors.currentPassword}
                autoComplete="current-password"
              />
              <Input
                label="New password"
                type="password"
                name="newPassword"
                value={password.values.newPassword}
                onChange={password.handleChange}
                error={password.errors.newPassword}
                autoComplete="new-password"
              />
              <Input
                label="Confirm new password"
                type="password"
                name="confirmNewPassword"
                value={password.values.confirmNewPassword}
                onChange={password.handleChange}
                error={password.errors.confirmNewPassword}
                autoComplete="new-password"
              />
              <Button type="submit" variant="primary" loading={password.loading}>
                Change Password
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Security info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-slate-500" />
              <h2 className="font-semibold text-slate-800">Security</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="text-sm text-slate-600 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Password hashing</span>
                <span className="font-medium text-green-700">Argon2id ✓</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last login</span>
                <span>{user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Unknown'}</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
