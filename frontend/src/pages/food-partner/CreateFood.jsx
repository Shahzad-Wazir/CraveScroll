import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage, isRequestCanceled } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const CATEGORIES = [
  'Street Food',
  'Main Course',
  'Snacks',
  'Dessert',
  'Beverages',
  'Healthy',
  'Fast Food',
  'Other',
];
const DIET_TYPES = ['Veg', 'Non-Veg', 'Vegan'];
const MAX_VIDEO_MB = 30;

const CreateFood = () => {
  const { account } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Street Food');
  const [dietType, setDietType] = useState('Veg');
  const [videoFile, setVideoFile] = useState(null);
  const [videoURL, setVideoURL] = useState('');
  const [thumbnailURL, setThumbnailURL] = useState('');
  const [fileError, setFileError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [createdReel, setCreatedReel] = useState(null);

  const fileInputRef = useRef(null);
  const uploadAbortRef = useRef(null);

  useEffect(() => {
    if (!videoFile) {
      setVideoURL('');
      setThumbnailURL('');
      return;
    }
    const url = URL.createObjectURL(videoFile);
    setVideoURL(url);

    // Auto-capture a thumbnail frame from the selected video
    const tempVideo = document.createElement('video');
    tempVideo.src = url;
    tempVideo.muted = true;
    tempVideo.playsInline = true;
    tempVideo.currentTime = 0.5;
    tempVideo.onloadeddata = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = Math.round((tempVideo.videoHeight / (tempVideo.videoWidth || 1)) * 240) || 360;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
        setThumbnailURL(canvas.toDataURL('image/jpeg', 0.75));
      } catch {
        setThumbnailURL('');
      }
    };

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoFile]);

  const validateAndSetFile = (file) => {
    if (!file) {
      setVideoFile(null);
      setFileError('');
      return;
    }
    if (!['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'].includes(file.type)) {
      setFileError('Unsupported format. Please choose an MP4, WebM, or MOV video.');
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setFileError(`Video is ${(file.size / 1024 / 1024).toFixed(1)} MB — max allowed is ${MAX_VIDEO_MB} MB.`);
      return;
    }
    setFileError('');
    setVideoFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    validateAndSetFile(e.dataTransfer?.files?.[0]);
  };

  const handleCancelUpload = () => {
    uploadAbortRef.current?.abort();
    setUploading(false);
    setUploadProgress(0);
    showToast('Upload canceled', 'info');
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setCategory('Street Food');
    setDietType('Veg');
    setVideoFile(null);
    setThumbnailURL('');
    setFileError('');
    setUploadProgress(0);
    setCreatedReel(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!videoFile || !name.trim() || uploading) return;

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('description', description.trim());
    formData.append('price', price === '' ? '0' : String(Number(price)));
    formData.append('category', category);
    formData.append('dietType', dietType);
    formData.append('video', videoFile);

    uploadAbortRef.current = new AbortController();
    setUploading(true);
    setUploadProgress(0);

    try {
      const { data } = await api.post('/food', formData, {
        signal: uploadAbortRef.current.signal,
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) {
            setUploadProgress(Math.round((evt.loaded * 100) / evt.total));
          }
        },
      });
      setCreatedReel(data.food);
      showToast('Food reel published to CraveScroll!', 'success');
    } catch (err) {
      if (!isRequestCanceled(err)) {
        showToast(getErrorMessage(err, 'Failed to upload food reel'), 'error');
      }
    } finally {
      setUploading(false);
    }
  };

  const isDisabled = useMemo(() => !name.trim() || !videoFile || uploading, [name, videoFile, uploading]);

  if (createdReel) {
    return (
      <div className="page-container">
        <div className="form-card upload-success-card">
          <div className="success-badge">✓</div>
          <h1>Reel Published!</h1>
          <p className="auth-subtitle">
            <strong>{createdReel.name}</strong> is now live on the CraveScroll feed.
          </p>
          <div className="success-actions">
            <Link to={`/reel/${createdReel._id}`} className="btn-primary">View Live Reel</Link>
            <Link to={`/food-partner/${account?._id}`} className="btn-secondary">Go to My Store</Link>
            <button type="button" className="btn-secondary" onClick={resetForm}>Post Another Reel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="form-card">
        <header className="form-card__header">
          <h1>Post a Food Reel</h1>
          <p>Upload a vertical dish video (up to {MAX_VIDEO_MB}MB) with price and category.</p>
        </header>

        <form className="auth-form" onSubmit={onSubmit}>
          <div className="field-group">
            <label htmlFor="foodVideo">Dish Video</label>
            <input
              id="foodVideo"
              ref={fileInputRef}
              className="file-input-hidden"
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(e) => validateAndSetFile(e.target.files?.[0])}
            />

            <div
              className="file-dropzone"
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <strong>Tap to upload</strong> or drag and drop
              <span className="file-hint">MP4, WebM, MOV · Max {MAX_VIDEO_MB} MB</span>
            </div>

            {fileError && <div className="alert-error" role="alert">{fileError}</div>}

            {videoFile && (
              <div className="file-chip">
                <span className="file-chip-name">{videoFile.name}</span>
                <span className="file-chip-size">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</span>
                <button
                  type="button"
                  className="btn-ghost-sm"
                  disabled={uploading}
                  onClick={() => {
                    setVideoFile(null);
                    setFileError('');
                  }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {videoURL && (
            <div className="preview-grid">
              <video className="video-preview-el" src={videoURL} controls playsInline preload="metadata" />
              {thumbnailURL && (
                <div className="thumb-preview-box">
                  <span className="thumb-label">Cover Frame</span>
                  <img src={thumbnailURL} alt="Video cover preview" className="thumb-preview-img" />
                </div>
              )}
            </div>
          )}

          <div className="field-group">
            <label htmlFor="foodName">Dish Name</label>
            <input
              id="foodName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Tandoori Paneer Tikka Wrap"
              required
            />
          </div>

          <div className="three-col">
            <div className="field-group">
              <label htmlFor="foodPrice">Price (₹)</label>
              <input
                id="foodPrice"
                type="number"
                min="0"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="149"
              />
            </div>

            <div className="field-group">
              <label htmlFor="foodCategory">Category</label>
              <select id="foodCategory" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="foodDiet">Diet Type</label>
              <select id="foodDiet" value={dietType} onChange={(e) => setDietType(e.target.value)}>
                {DIET_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="foodDesc">Description</label>
            <textarea
              id="foodDesc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Highlight taste, spice level, ingredients, or combo offers..."
              maxLength={500}
            />
          </div>

          {uploading && (
            <div className="progress-wrap" aria-live="polite">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
              <div className="progress-row">
                <span className="progress-label">
                  {uploadProgress < 100 ? `Uploading video... ${uploadProgress}%` : 'Saving to ImageKit...'}
                </span>
                <button type="button" className="btn-ghost-sm" onClick={handleCancelUpload}>
                  Cancel Upload
                </button>
              </div>
            </div>
          )}

          <button className="btn-primary btn-block" type="submit" disabled={isDisabled}>
            {uploading ? 'Publishing Reel...' : 'Publish Food Reel'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateFood;
