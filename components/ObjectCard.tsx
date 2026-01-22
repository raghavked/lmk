'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Star, MapPin, DollarSign, Clock, ExternalLink } from 'lucide-react';
import RatingModal from './RatingModal';

interface ObjectCardProps {
  object: any;
  rank?: number;
  score?: number;
  explanation?: {
    hook?: string;
    why_youll_like?: string;
    friend_callout?: string;
    caveats?: string;
  };
}

export default function ObjectCard({ object, rank, score, explanation }: ObjectCardProps) {
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  
  const renderExternalRatings = () => {
    if (!object.external_ratings || object.external_ratings.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-2">
        {object.external_ratings.map((rating: any, idx: number) => (
          <div key={idx} className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span className="font-semibold">{rating.score.toFixed(1)}</span>
            <span className="text-gray-500">{rating.source}</span>
          </div>
        ))}
      </div>
    );
  };
  
  const renderPriceLevel = () => {
    if (!object.price_level) return null;
    
    return (
      <div className="flex items-center gap-1 text-gray-600">
        <DollarSign className="w-4 h-4" />
        <span className="text-sm">{'$'.repeat(object.price_level)}</span>
      </div>
    );
  };
  
  const renderTimeCommitment = () => {
    if (!object.time_commitment) return null;
    
    const minutes = object.time_commitment.typical_minutes || object.time_commitment.max_minutes;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    return (
      <div className="flex items-center gap-1 text-gray-600">
        <Clock className="w-4 h-4" />
        <span className="text-sm">
          {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}
        </span>
      </div>
    );
  };
  
  const renderLocation = () => {
    if (!object.location) return null;
    
    return (
      <div className="flex items-center gap-1 text-gray-600">
        <MapPin className="w-4 h-4" />
        <span className="text-sm">{object.location.city}</span>
      </div>
    );
  };
  
  return (
    <>
      <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition">
        {rank && (
          <div className="absolute top-2 left-2 bg-primary-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm z-10">
            {rank}
          </div>
        )}
        
        {object.primary_image && (
          <div className="relative h-48 bg-gray-200">
            <Image
              src={object.primary_image.url}
              alt={object.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}
        
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-lg text-gray-900 line-clamp-2">{object.title}</h3>
            {score && (
              <div className="flex items-center gap-1 bg-primary-100 text-primary-700 px-2 py-1 rounded ml-2 flex-shrink-0">
                <Star className="w-4 h-4 fill-current" />
                <span className="font-bold text-sm">{score.toFixed(1)}</span>
              </div>
            )}
          </div>
          
          {explanation?.hook && (
            <p className="text-sm text-gray-600 mb-3 italic">"{explanation.hook}"</p>
          )}
          
          {explanation?.why_youll_like && (
            <p className="text-sm text-gray-700 mb-3">{explanation.why_youll_like}</p>
          )}
          
          {explanation?.friend_callout && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
              <p className="text-sm text-blue-800">{explanation.friend_callout}</p>
            </div>
          )}
          
          {explanation?.caveats && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3">
              <p className="text-sm text-yellow-800">{explanation.caveats}</p>
            </div>
          )}
          
          <div className="mb-3">
            {renderExternalRatings()}
          </div>
          
          <div className="flex flex-wrap gap-3 mb-3 text-sm">
            {renderPriceLevel()}
            {renderTimeCommitment()}
            {renderLocation()}
          </div>
          
          {object.tags && object.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {object.tags.slice(0, 4).map((tag: string, idx: number) => (
                <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={() => setRatingModalOpen(true)}
              className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition font-medium text-sm"
            >
              Rate
            </button>
            
            {object.source_links && object.source_links[0] && (
              <a
                href={object.source_links[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
      
      {ratingModalOpen && (
        <RatingModal
          object={object}
          onClose={() => setRatingModalOpen(false)}
        />
      )}
    </>
  );
}
