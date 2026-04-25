import React, { useState, useEffect } from 'react';
import API from '../api/axios';

const generateTimeRows = () => {
  const rows = [];
  for (let h = 0; h < 24; h++) {
    const hh = h.toString().padStart(2, '0');
    rows.push(`${hh}:00`, `${hh}:30`);
  }
  return rows;
};
const TIME_ROWS = generateTimeRows();

const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
  return new Date(d.setDate(diff));
};

export default function BXDashboard() {
  const [activeTab, setActiveTab] = useState('calendar'); 
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createDate, setCreateDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [isCreating, setIsCreating] = useState(false);

  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [walkInClient, setWalkInClient] = useState('');
  const [walkInNotes, setWalkInNotes] = useState('');
  const [walkInDate, setWalkInDate] = useState('');
  const [walkInStartTime, setWalkInStartTime] = useState('12:00');
  const [walkInEndTime, setWalkInEndTime] = useState('12:30');
  const [isCreatingWalkIn, setIsCreatingWalkIn] = useState(false);
  
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [bio, setBio] = useState('');
  const [address, setAddress] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  const [services, setServices] = useState([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('30');
  const [isAddingService, setIsAddingService] = useState(false);

  const [photos, setPhotos] = useState([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [enlargedPhoto, setEnlargedPhoto] = useState(null);

  const [user, setUser] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);

  // NEW: Stats State
  const [stats, setStats] = useState({ today_bookings: 0, today_revenue: 0, overall_bookings: 0 });

  const currentWeekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const res = await API.get('my/schedule/');
      setSchedule(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const profileRes = await API.get('my/profile/');
      setBio(profileRes.data.bio || '');
      setAddress(profileRes.data.address || '');

      const servicesRes = await API.get('my/services/');
      setServices(servicesRes.data);

      const photosRes = await API.get('my/photos/');
      setPhotos(photosRes.data);
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  };

  const fetchUser = async () => {
    try {
      const res = await API.get('auth/me/');
      setUser(res.data);
      setFirstName(res.data.first_name || '');
      setLastName(res.data.last_name || '');
      setEmail(res.data.email || '');
      setPhone(res.data.phone || '');
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  };

  // NEW: Fetch Dashboard Stats
  const fetchStats = async () => {
    try {
      const res = await API.get('my/stats/');
      setStats(res.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  useEffect(() => {
    fetchSchedule();
    fetchSettings();
    fetchUser();
    fetchStats();
  }, []);

  const handlePrevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + 7);
    setCurrentWeekStart(next);
  };

  const handleToday = () => {
    setCurrentWeekStart(getStartOfWeek(new Date()));
  };

  const handleCreateAvailability = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      let current = new Date(`${createDate}T${startTime}:00`);
      const end = new Date(`${createDate}T${endTime}:00`);
      const promises = [];

      while (current < end) {
        const slotStartTime = current.toTimeString().substring(0, 5);
        current.setMinutes(current.getMinutes() + 30); 
        const slotEndTime = current.toTimeString().substring(0, 5);

        promises.push(
          API.post('my/slots/', { 
            date: createDate,
            start_time: slotStartTime,
            end_time: slotEndTime,
            status: 'available'
          })
        );
      }
      await Promise.all(promises);
      await fetchSchedule();
      await fetchStats(); // Refresh stats!
      setIsModalOpen(false);
      alert('Availability created successfully!');
    } catch (err) {
      console.error(err);
      alert('Error creating slots.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateWalkIn = async (e) => {
    e.preventDefault();
    setIsCreatingWalkIn(true);
    try {
      await API.post('my/slots/', {
        date: walkInDate,
        start_time: walkInStartTime,
        end_time: walkInEndTime,
        status: 'walk_in',
        client_name: walkInClient,
        notes: walkInNotes
      });
      await fetchSchedule();
      await fetchStats(); // Refresh stats!
      setIsWalkInModalOpen(false);
      setWalkInClient('');
      setWalkInNotes('');
      alert('Walk-in added successfully!');
    } catch (err) {
      console.error(err);
      alert('Error adding walk-in.');
    } finally {
      setIsCreatingWalkIn(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await API.put('my/profile/', { bio, address });
      alert('Profile updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setIsSavingUser(true);
    try {
      await API.patch('auth/me/', {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone
      });
      alert('Account details updated successfully!');
      fetchUser(); 
    } catch (err) {
      console.error(err);
      alert('Failed to update account details.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handlePriceChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, ''); 
    const formatted = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ","); 
    setNewServicePrice(formatted);
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    setIsAddingService(true);
    try {
      const cleanPrice = parseInt(newServicePrice.replace(/,/g, ''));
      
      await API.post('my/services/', {
        name: newServiceName,
        price: cleanPrice,
        duration_minutes: parseInt(newServiceDuration)
      });
      setNewServiceName('');
      setNewServicePrice('');
      setNewServiceDuration('30');
      await fetchSettings(); 
    } catch (err) {
      console.error(err);
      alert('Failed to add service.');
    } finally {
      setIsAddingService(false);
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await API.delete(`my/services/${id}/`);
      await fetchSettings(); 
    } catch (err) {
      console.error(err);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setIsUploadingPhoto(true);
    try {
      await API.post('my/photos/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchSettings();
    } catch (err) {
      console.error(err);
      alert('Failed to upload photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (id) => {
    if (!window.confirm('Delete this photo?')) return;
    try {
      await API.delete(`my/photos/${id}/`);
      await fetchSettings();
    } catch (err) {
      console.error(err);
    }
  };

  const getSlot = (dateStr, timeStr) => {
    return schedule.find(slot => slot.date === dateStr && slot.start_time.startsWith(timeStr));
  };

  const displayAvatar = user?.first_name 
    ? user.first_name.charAt(0).toUpperCase() 
    : (user?.username ? user.username.charAt(0).toUpperCase() : 'U');

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    window.location.href = '/login'; 
  };

  const handleMarkNoShow = async () => {
    if (!window.confirm("Are you sure? The customer will not be able to leave a review.")) return;
    
    try {
      await API.post(`my/slots/${selectedSlot.id}/no-show/`);
      alert("Appointment marked as No-Show.");
      setSelectedSlot(null); // Close the modal
      fetchSchedule();       // Refresh the calendar
      fetchStats();          // Refresh the stats
    } catch (err) {
      console.error(err);
      alert("Failed to update status.");
    }
  };

  const handleDeleteSlot = async () => {
    if (!window.confirm("Are you sure you want to delete this available time slot?")) return;
    
    try {
      await API.delete(`my/slots/${selectedSlot.id}/`);
      alert("Slot removed successfully.");
      setSelectedSlot(null); // Close the modal
      fetchSchedule();       // Refresh the calendar
    } catch (err) {
      console.error(err);
      alert("Failed to delete slot.");
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      
      <header style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '0 40px', height: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40, height: '100%' }}>
          <h1 style={{ margin: 0, fontSize: 30, color: '#F43F5E', letterSpacing: '-0.5px' }}>Ulan</h1>
          
          <nav style={{ display: 'flex', gap: 20, height: '100%' }}>
            <button onClick={() => setActiveTab('calendar')} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', fontWeight: activeTab === 'calendar' ? 'bold' : 'normal', color: activeTab === 'calendar' ? '#111827' : '#6B7280', borderBottom: activeTab === 'calendar' ? '2px solid #F43F5E' : '2px solid transparent', height: '100%', padding: '0 5px' }}>
              Calendar
            </button>
            <button onClick={() => setActiveTab('settings')} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', fontWeight: activeTab === 'settings' ? 'bold' : 'normal', color: activeTab === 'settings' ? '#111827' : '#6B7280', borderBottom: activeTab === 'settings' ? '2px solid #F43F5E' : '2px solid transparent', height: '100%', padding: '0 5px' }}>
              Services & Portfolio
            </button>
            <button onClick={() => setActiveTab('profile')} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', fontWeight: activeTab === 'profile' ? 'bold' : 'normal', color: activeTab === 'profile' ? '#111827' : '#6B7280', borderBottom: activeTab === 'profile' ? '2px solid #F43F5E' : '2px solid transparent', height: '100%', padding: '0 5px' }}>
              Account Profile
            </button>
          </nav>
        </div>

        {/* UPDATED AVATAR: Now clickable and linked to the profile tab! */}
        <div 
          onClick={() => setActiveTab('profile')}
          style={{ width: 35, height: 35, background: '#E5E7EB', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#374151', fontSize: 16, cursor: 'pointer', border: '1px solid #D1D5DB' }}
          title="Go to Account Profile"
        >
          {displayAvatar}
        </div>

      </header>

      {/* --- TAB CONTENT: CALENDAR --- */}
      {activeTab === 'calendar' && (
        <div style={{ display: 'flex', height: 'calc(100vh - 70px)', maxWidth: 1200, margin: '0 auto', background: 'white', borderLeft: '1px solid #E5E7EB', borderRight: '1px solid #E5E7EB' }}>
          
          <div style={{ width: 260, padding: 20, borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 15 }}>
            <button onClick={() => setIsModalOpen(true)} style={{ padding: 12, background: '#F43F5E', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 15 }}>
              Set up availability
            </button>
            <button onClick={() => setIsWalkInModalOpen(true)} style={{ padding: 12, background: 'white', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>
              Add Walk-in
            </button>

            {/* STATUS LEGEND */}
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 14, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1 }}>Status Legend</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10, fontSize: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 12, height: 12, background: '#E5E7EB', borderRadius: 2 }}></span> Available</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 12, height: 12, background: '#06B6D4', borderRadius: 2 }}></span> Booked</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 12, height: 12, background: '#D946EF', borderRadius: 2 }}></span> Walk-in</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 12, height: 12, background: '#10B981', borderRadius: 2 }}></span> Completed</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 12, height: 12, background: '#EF4444', borderRadius: 2 }}></span> No-Show</div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* NEW: DASHBOARD METRICS CARDS */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
              <div style={{ flex: 1, background: '#F9FAFB', padding: 20, borderRadius: 12, border: '1px solid #E5E7EB' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: 14, color: '#6B7280', fontWeight: 'normal' }}>today's bookings</h3>
                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#06B6D4' }}>{stats.today_bookings}</div>
              </div>
              <div style={{ flex: 1, background: '#F9FAFB', padding: 20, borderRadius: 12, border: '1px solid #E5E7EB' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: 14, color: '#6B7280', fontWeight: 'normal' }}>today's revenue</h3>
                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#111827' }}>
                  {stats.today_revenue > 0 ? `${(stats.today_revenue / 1000)}k` : '0'}
                </div>
              </div>
              <div style={{ flex: 1, background: '#F9FAFB', padding: 20, borderRadius: 12, border: '1px solid #E5E7EB' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: 14, color: '#6B7280', fontWeight: 'normal' }}>overall bookings</h3>
                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#D946EF' }}>{stats.overall_bookings}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                <div style={{ display: 'flex', border: '1px solid #D1D5DB', borderRadius: 8, overflow: 'hidden' }}>
                  <button onClick={handlePrevWeek} style={{ padding: '8px 15px', background: 'white', border: 'none', borderRight: '1px solid #D1D5DB', cursor: 'pointer', fontWeight: 'bold' }}>&lt;</button>
                  <button onClick={handleNextWeek} style={{ padding: '8px 15px', background: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>&gt;</button>
                </div>
                <h2 style={{ margin: 0, fontSize: 18 }}>
                  {new Date(currentWeekDays[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(currentWeekDays[6]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </h2>
              </div>
              <button onClick={handleToday} style={{ padding: '8px 15px', background: '#F3F4F6', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>Today</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 8, position: 'relative' }}>
              {loading && <div style={{ position: 'absolute', top: 20, left: '50%' }}>Loading...</div>}
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <tr>
                    <th style={{ width: 60, padding: 10, borderBottom: '1px solid #E5E7EB', borderRight: '1px solid #E5E7EB' }}></th>
                    {currentWeekDays.map(date => (
                      <th key={date} style={{ padding: '10px 5px', borderBottom: '1px solid #E5E7EB', borderRight: '1px solid #E5E7EB', textAlign: 'center', fontWeight: 'normal' }}>
                        <div style={{ color: '#6B7280', fontSize: 12 }}>{new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <div style={{ fontWeight: 'bold', fontSize: 14 }}>{new Date(date).getDate()}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_ROWS.map((time) => (
                    <tr key={time}>
                      <td style={{ borderBottom: time.endsWith('30') ? '1px solid #E5E7EB' : 'none', borderRight: '1px solid #E5E7EB', textAlign: 'center', padding: '0', height: 25, position: 'relative' }}>
                        {time.endsWith('00') && <span style={{ position: 'absolute', top: 2, right: 8, fontSize: 11, color: '#9CA3AF' }}>{time}</span>}
                      </td>
                      
                      {currentWeekDays.map(date => {
                        const slot = getSlot(date, time);
                        let bgColor = 'transparent';
                        if (slot?.status === 'available') bgColor = '#E5E7EB';
                        if (slot?.status === 'booked') bgColor = '#06B6D4';
                        if (slot?.status === 'walk_in') bgColor = '#D946EF';
                        if (slot?.status === 'completed') bgColor = '#10B981';
                        if (slot?.status === 'no_show') bgColor = '#EF4444';

                        return (
                          <td key={`${date}-${time}`} style={{ borderBottom: time.endsWith('30') ? '1px solid #E5E7EB' : '1px dashed #F3F4F6', borderRight: '1px solid #E5E7EB', padding: 2, height: 25 }}>
                            {slot && (
                              <div 
                                onClick={() => setSelectedSlot(slot)}
                                style={{ background: bgColor, height: '100%', borderRadius: 4, opacity: 0.8, 
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                  color: 'white', fontSize: 10, fontWeight: 'bold', overflow: 'hidden', 
                                  cursor: 'pointer' }} 
                                title={slot.status}
                              >
                                 {slot.display_name ? slot.display_name : ''}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: SETTINGS & PORTFOLIO --- */}
      {activeTab === 'settings' && (
        <div style={{ maxWidth: 800, margin: '40px auto', padding: 30, background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #E5E7EB' }}>
          
          <h1 style={{ marginTop: 0, marginBottom: 30, fontSize: 24, borderBottom: '2px solid #F3F4F6', paddingBottom: 15 }}>Storefront Settings</h1>

          {/* SECTION 1: BASIC INFO */}
          <h2 style={{ marginTop: 0, fontSize: 18, color: '#374151', marginBottom: 15 }}>Shop Information</h2>
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 15, marginBottom: 40 }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows="3" style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #D1D5DB', fontFamily: 'inherit' }} placeholder="Tell customers about your experience..." />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>Shop Address</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #D1D5DB' }} placeholder="e.g. 123 Main St, Tashkent" />
            </div>
            <button type="submit" disabled={isSavingProfile} style={{ alignSelf: 'flex-end', padding: '10px 25px', background: '#111827', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', marginTop: 10 }}>
              {isSavingProfile ? 'Saving...' : 'Save'}
            </button>
          </form>

          {/* SECTION 2: PORTFOLIO GALLERY */}
          <h2 style={{ marginTop: 0, fontSize: 18, color: '#374151', marginBottom: 15, borderTop: '1px solid #E5E7EB', paddingTop: 30 }}>Portfolio Gallery</h2>
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 20 }}>
              <label style={{ padding: '10px 20px', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>
                {isUploadingPhoto ? 'Uploading...' : 'Upload New Photo'}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} disabled={isUploadingPhoto} />
              </label>
              <span style={{ fontSize: 14, color: '#6B7280' }}>JPEG or PNG, max 5MB.</span>
            </div>

            {photos.length === 0 ? (
              <p style={{ color: '#6B7280', fontStyle: 'italic' }}>No photos uploaded yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 15 }}>
                {photos.map(photo => (
                  <div key={photo.id} style={{ position: 'relative', height: 150, borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                    <img src={photo.image} alt="Portfolio" onClick={() => setEnlargedPhoto(photo.image)} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} />
                    <button onClick={() => handleDeletePhoto(photo.id)} style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 3: SERVICES */}
          <h2 style={{ marginTop: 0, fontSize: 18, color: '#374151', marginBottom: 15, borderTop: '1px solid #E5E7EB', paddingTop: 30 }}>My Services</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 30 }}>
            {services.length === 0 ? (
              <p style={{ color: '#6B7280', fontStyle: 'italic' }}>No services added yet. Add one below!</p>
            ) : (
              services.map(svc => (
                <div key={svc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 15, border: '1px solid #E5E7EB', borderRadius: 8, background: '#F9FAFB' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: 16 }}>{svc.name}</strong>
                    <span style={{ color: '#6B7280', fontSize: 14 }}>{svc.duration_minutes} mins • {svc.price.toLocaleString()} UZS</span>
                  </div>
                  <button onClick={() => handleDeleteService(svc.id)} style={{ padding: '6px 12px', background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>Delete</button>
                </div>
              ))
            )}
          </div>

          <h3 style={{ fontSize: 14, color: '#374151', marginBottom: 10 }}>Add New Service</h3>
          <form onSubmit={handleAddService} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 5 }}>Service Name</label>
              <input type="text" required value={newServiceName} onChange={e => setNewServiceName(e.target.value)} style={{ width: '100%', height: '42px', boxSizing: 'border-box', padding: 10, borderRadius: 6, border: '1px solid #D1D5DB' }} placeholder="e.g. Skin Fade" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 5 }}>Price (UZS)</label>
              <input type="text" required value={newServicePrice} onChange={handlePriceChange} style={{ width: '100%', height: '42px', boxSizing: 'border-box', padding: 10, borderRadius: 6, border: '1px solid #D1D5DB' }} placeholder="100,000" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 5 }}>Duration</label>
              <select value={newServiceDuration} onChange={e => setNewServiceDuration(e.target.value)} style={{ width: '100%', height: '42px', boxSizing: 'border-box', padding: '0 10px', borderRadius: 6, border: '1px solid #D1D5DB' }}>
                <option value="15">15 mins</option>
                <option value="30">30 mins</option>
                <option value="45">45 mins</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
              </select>
            </div>
            <button type="submit" disabled={isAddingService} style={{ padding: '0 20px', height: '42px', boxSizing: 'border-box', background: '#F43F5E', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>
              {isAddingService ? '...' : 'Add'}
            </button>
          </form>
        </div>
      )}

      {/* --- TAB CONTENT: ACCOUNT PROFILE (NEW) --- */}
      {activeTab === 'profile' && (
        <div style={{ maxWidth: 800, margin: '40px auto', padding: 30, background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #E5E7EB' }}>
          
          <h1 style={{ marginTop: 0, marginBottom: 30, fontSize: 24, borderBottom: '2px solid #F3F4F6', paddingBottom: 15 }}>Account Profile</h1>

          <div style={{ display: 'flex', gap: 20, marginBottom: 30, background: '#F9FAFB', padding: 15, borderRadius: 8, border: '1px solid #E5E7EB' }}>
            <div style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 12, color: '#6B7280', fontWeight: 'bold', textTransform: 'uppercase' }}>Username</span>
              <strong style={{ fontSize: 16, color: '#111827' }}>{user?.username || '—'}</strong>
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 12, color: '#6B7280', fontWeight: 'bold', textTransform: 'uppercase' }}>Role</span>
              <strong style={{ fontSize: 16, color: '#111827', textTransform: 'capitalize' }}>{user?.role || '—'}</strong>
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 12, color: '#6B7280', fontWeight: 'bold', textTransform: 'uppercase' }}>Date Joined</span>
              <strong style={{ fontSize: 16, color: '#111827' }}>
                {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : '—'}
              </strong>
            </div>
          </div>

          <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div style={{ display: 'flex', gap: 15 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>First Name</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 6, border: '1px solid #D1D5DB' }} placeholder="e.g. Ulan" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>Last Name</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 6, border: '1px solid #D1D5DB' }} placeholder="e.g. Smith" />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 6, border: '1px solid #D1D5DB' }} placeholder="ulan@example.com" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>Phone Number</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 6, border: '1px solid #D1D5DB' }} placeholder="+998 90 123 45 67" />
            </div>

            <button type="submit" disabled={isSavingUser} style={{ alignSelf: 'flex-end', padding: '14px', background: '#111827', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', marginTop: 10, width: '100%', fontSize: 16 }}>
              {isSavingUser ? 'Saving...' : 'Save Account Details'}
            </button>
          </form>

         <div style={{ marginTop: 20 }}>
            <button 
              onClick={handleLogout} 
              style={{ width: '100%', padding: '14px', background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 16, transition: 'background 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#FEF2F2'}
            >
              Log Out
            </button>
          </div>

        </div>
      )}

      {/* --- ENLARGED PHOTO MODAL --- */}
      {enlargedPhoto && (
        <div 
          onClick={() => setEnlargedPhoto(null)} 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, cursor: 'pointer' }}
        >
          <img src={enlargedPhoto} alt="Enlarged Portfolio" style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 8, objectFit: 'contain' }} />
          <button onClick={() => setEnlargedPhoto(null)} style={{ position: 'absolute', top: 20, right: 30, background: 'none', border: 'none', color: 'white', fontSize: 40, cursor: 'pointer' }}>
            &times;
          </button>
        </div>
      )}

      {/* AVAILABILITY MODAL */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
          <div style={{ background: 'white', padding: 30, borderRadius: 12, width: 400 }}>
            <h2 style={{ marginTop: 0 }}>Add Availability</h2>
            <form onSubmit={handleCreateAvailability} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>Date</label>
                <input type="date" required value={createDate} onChange={e => setCreateDate(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #D1D5DB' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>Start Time</label>
                  <input type="time" required step="1800" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #D1D5DB' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>End Time</label>
                  <input type="time" required step="1800" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #D1D5DB' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: 10, background: '#F3F4F6', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isCreating} style={{ flex: 1, padding: 10, background: '#F43F5E', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>
                  {isCreating ? 'Creating...' : 'Create Slots'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WALK-IN MODAL */}
      {isWalkInModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
          <div style={{ background: 'white', padding: 30, borderRadius: 12, width: 400 }}>
            <h2 style={{ marginTop: 0 }}>Log a Walk-in</h2>
            <form onSubmit={handleCreateWalkIn} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>Client Name (Optional)</label>
                <input type="text" placeholder="e.g. Tim" value={walkInClient} onChange={e => setWalkInClient(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #D1D5DB' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>Notes (Optional)</label>
                <textarea placeholder="e.g. Wants a skin fade" value={walkInNotes} onChange={e => setWalkInNotes(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #D1D5DB', minHeight: '60px', fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>Date</label>
                <input type="date" required value={walkInDate} onChange={e => setWalkInDate(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #D1D5DB' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>Start Time</label>
                  <input type="time" required step="1800" value={walkInStartTime} onChange={e => setWalkInStartTime(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #D1D5DB' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>End Time</label>
                  <input type="time" required step="1800" value={walkInEndTime} onChange={e => setWalkInEndTime(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #D1D5DB' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setIsWalkInModalOpen(false)} style={{ flex: 1, padding: 10, background: '#F3F4F6', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isCreatingWalkIn} style={{ flex: 1, padding: 10, background: '#D946EF', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>
                  {isCreatingWalkIn ? 'Saving...' : 'Add Walk-in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SLOT DETAILS MODAL */}
      {selectedSlot && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
          <div style={{ background: 'white', padding: 30, borderRadius: 12, width: 350 }}>
            <h2 style={{ marginTop: 0, borderBottom: '1px solid #E5E7EB', paddingBottom: 10 }}>Appointment Details</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 15 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280' }}>Date:</span>
                <strong>{selectedSlot.date}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280' }}>Time:</span>
                <strong>{selectedSlot.start_time.substring(0, 5)} - {selectedSlot.end_time.substring(0, 5)}</strong>
              </div>
              {/* Dynamic Status Color inside the Modal */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280' }}>Status:</span>
                <strong style={{ 
                  color: selectedSlot.status === 'walk_in' ? '#D946EF' : 
                         selectedSlot.status === 'completed' ? '#10B981' :
                         selectedSlot.status === 'no_show' ? '#EF4444' : '#06B6D4', 
                  textTransform: 'capitalize' 
                }}>
                  {selectedSlot.status.replace('_', '-')}
                </strong>
              </div>

              {selectedSlot.display_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6B7280' }}>Client:</span>
                  <strong>{selectedSlot.display_name}</strong>
                </div>
              )}
              
              {selectedSlot.notes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>
                  <span style={{ color: '#6B7280' }}>Notes:</span>
                  <div style={{ background: '#F9FAFB', padding: 10, borderRadius: 6, fontSize: 14, border: '1px solid #E5E7EB' }}>
                    {selectedSlot.notes}
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => setSelectedSlot(null)} style={{ marginTop: 25, width: '100%', padding: 10, background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>
              Close
            </button>

            {/* Delete button ONLY for available slots */}
            {selectedSlot.status === 'available' && (
              <button 
                onClick={handleDeleteSlot} 
                style={{ width: '100%', padding: 10, background: 'white', color: '#EF4444', border: '1px solid #EF4444', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', marginTop: 10 }}
              >
                Delete Slot
              </button>
            )}

            {/* Allow barber to mark no-show even if it auto-completed! */}
              {(selectedSlot.status === 'booked' || selectedSlot.status === 'completed') && (
                <button 
                  onClick={handleMarkNoShow} 
                  style={{ flex: 1, padding: 10, background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', marginTop: 15, width: '100%' }}
                >
                  Mark No-Show
                </button>
              )}

          </div>
        </div>
      )}

    </div>
  );
}