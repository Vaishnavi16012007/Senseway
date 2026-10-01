import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  PhoneCall,
  Share2,
  Volume2,
  Users,
  Plus,
  Trash2,
  MapPin,
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { getHumanReadableLocation } from '../services/locationService';
import type { TrustedContact } from '../types';

const TRUSTED_STORAGE_KEY = 'senseway_trusted_contacts';

export const EmergencyPage: React.FC = () => {
  const { speak, settings } = useAccessibility();

  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [copiedLocation, setCopiedLocation] = useState(false);

  const [contacts, setContacts] = useState<TrustedContact[]>(() => {
    try {
      const stored = localStorage.getItem(TRUSTED_STORAGE_KEY);
      return stored
        ? JSON.parse(stored)
        : [
            {
              id: 'c1',
              name: 'Dr. Sarah Wilson',
              phone: '+1 555-0199',
              relationship: 'Physician / Emergency Care',
            },
            {
              id: 'c2',
              name: 'David (Family)',
              phone: '+1 555-0142',
              relationship: 'Family Member',
            },
          ];
    } catch {
      return [];
    }
  });

  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRelation, setNewContactRelation] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(TRUSTED_STORAGE_KEY, JSON.stringify(contacts));
    } catch (e) {
      console.warn('Unable to persist emergency contacts:', e);
    }
  }, [contacts]);

  useEffect(() => {
    const fetchLoc = async () => {
      try {
        setIsLoadingLocation(true);
        const loc = await getHumanReadableLocation();
        setCurrentAddress(loc.humanLocation.fullAddress);
      } catch (err) {
        console.warn('Emergency location lookup:', err);
      } finally {
        setIsLoadingLocation(false);
      }
    };
    fetchLoc();
  }, []);

  const handleSosClick = () => {
    speak('Emergency mode activated. Do you want to call emergency services, contact a trusted person, or broadcast your location?');
  };

  const handleCallEmergency = () => {
    speak(`Dialing emergency services at ${settings.emergencyNumber}.`);
    window.location.href = `tel:${settings.emergencyNumber}`;
  };

  const handleSpeakLocation = async () => {
    if (currentAddress) {
      speak(`My current location is: ${currentAddress}. Please assist.`, { interrupt: true });
    } else {
      speak('Determining readable location, please wait.');
      try {
        const loc = await getHumanReadableLocation();
        setCurrentAddress(loc.humanLocation.fullAddress);
        speak(`My current location is: ${loc.humanLocation.fullAddress}. Please assist.`);
      } catch {
        speak('Location is currently unavailable.');
      }
    }
  };

  const handleShareLocation = async () => {
    let addressToShare = currentAddress;
    if (!addressToShare) {
      try {
        const loc = await getHumanReadableLocation();
        addressToShare = loc.humanLocation.fullAddress;
        setCurrentAddress(addressToShare);
      } catch {
        addressToShare = 'Current physical location unavailable';
      }
    }

    const shareText = `🚨 SENSEWAY EMERGENCY ALERT:\nI require assistance.\n📍 My Location: ${addressToShare}\nSent via SenseWay Accessibility Companion.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SenseWay Emergency Assistance',
          text: shareText,
        });
        speak('Emergency location shared successfully.');
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    await navigator.clipboard.writeText(shareText);
    setCopiedLocation(true);
    speak('Emergency location text copied to clipboard. Ready to paste into SMS or messages.');
    setTimeout(() => setCopiedLocation(false), 3000);
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;

    const contact: TrustedContact = {
      id: 'c_' + Date.now(),
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      relationship: newContactRelation.trim() || 'Trusted Contact',
    };

    setContacts([...contacts, contact]);
    setNewContactName('');
    setNewContactPhone('');
    setNewContactRelation('');
    setShowAddContact(false);
    speak(`Added ${contact.name} to trusted contacts.`);
  };

  const handleDeleteContact = (id: string, name: string) => {
    setContacts(contacts.filter((c) => c.id !== id));
    speak(`Removed ${name} from emergency contacts.`);
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <section className="sos-hero-card" aria-label="Emergency SOS Action Center">
        <div
          className="sos-big-orb"
          onClick={handleSosClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleSosClick()}
          title="Activate Emergency Mode"
          aria-label="Activate Emergency SOS"
        >
          <AlertTriangle size={36} />
          <span className="sos-orb-text">SOS</span>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, marginBottom: '8px' }}>
          Emergency Assistance
        </h2>
        <p style={{ color: '#FCA5A5', fontSize: '1.05rem', maxWidth: '560px', margin: '0 auto 20px auto' }}>
          One-tap access to emergency services, location sharing, and your designated caregivers.
        </p>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)',
            fontSize: '0.92rem',
            color: '#FFFFFF',
            maxWidth: '90%',
          }}
        >
          <MapPin size={18} color="#FCA5A5" />
          <span>
            {isLoadingLocation
              ? 'Locating your current readable address...'
              : currentAddress || 'Location ready for emergency broadcast'}
          </span>
        </div>
      </section>

      <div className="sos-actions-grid">
        <div
          className="sos-action-card"
          onClick={handleCallEmergency}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleCallEmergency()}
          aria-label={`Call emergency number ${settings.emergencyNumber}`}
        >
          <div className="sos-action-icon-box">
            <PhoneCall size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
              CALL EMERGENCY ({settings.emergencyNumber})
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Direct connection to local emergency responders
            </p>
          </div>
        </div>

        <div
          className="sos-action-card"
          onClick={handleShareLocation}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleShareLocation()}
          aria-label="Share current location"
        >
          <div className="sos-action-icon-box" style={{ background: 'rgba(109, 61, 245, 0.1)', color: 'var(--primary-purple)' }}>
            <Share2 size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
              {copiedLocation ? 'LOCATION COPIED!' : 'SHARE MY LOCATION'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Broadcast your readable address to caregivers
            </p>
          </div>
        </div>

        <div
          className="sos-action-card"
          onClick={handleSpeakLocation}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleSpeakLocation()}
          aria-label="Speak location aloud"
        >
          <div className="sos-action-icon-box" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#16A34A' }}>
            <Volume2 size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
              SPEAK MY LOCATION
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Announce address aloud for bystanders
            </p>
          </div>
        </div>
      </div>

      <section className="sense-card" aria-label="Trusted Contacts Management">
        <div className="card-header-clean">
          <div className="card-title-box">
            <div className="card-icon-pill">
              <Users size={20} />
            </div>
            <div>
              <h3 className="card-title-text">Trusted Contacts</h3>
              <div className="card-subtitle-text">
                Direct contacts notified during emergency situations
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowAddContact(!showAddContact)}
            className="btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.88rem' }}
          >
            <Plus size={16} />
            <span>{showAddContact ? 'CANCEL' : 'ADD CONTACT'}</span>
          </button>
        </div>

        {showAddContact && (
          <form
            onSubmit={handleAddContact}
            style={{
              padding: '20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--soft-lavender)',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label className="form-label">Contact Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="e.g. Dr. Roberts"
                  required
                />
              </div>
              <div>
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-input"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="e.g. +1 555-0199"
                  required
                />
              </div>
              <div>
                <label className="form-label">Relationship / Role</label>
                <input
                  type="text"
                  className="form-input"
                  value={newContactRelation}
                  onChange={(e) => setNewContactRelation(e.target.value)}
                  placeholder="e.g. Caregiver, Sister"
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.88rem' }}>
              SAVE TRUSTED CONTACT
            </button>
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {contacts.map((contact) => (
            <div
              key={contact.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-main)',
                border: '1px solid var(--border-subtle)',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                  {contact.name}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {contact.relationship} • {contact.phone}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={`tel:${contact.phone}`}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                >
                  <PhoneCall size={14} />
                  <span>CALL</span>
                </a>

                <a
                  href={`sms:${contact.phone}?body=SenseWay%20Alert:%20I%20need%20assistance.%20Location:%20${encodeURIComponent(currentAddress)}`}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                >
                  <span>SMS</span>
                </a>

                <button
                  onClick={() => handleDeleteContact(contact.id, contact.name)}
                  className="btn-logout-icon"
                  title="Remove contact"
                  aria-label={`Remove ${contact.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default EmergencyPage;
