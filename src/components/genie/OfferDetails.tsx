import { Offer } from '@/api/genie';
import { useRebooking } from '@/contexts/Rebooking';
import Warning from '../Warning';
import ReturnTime from './ReturnTime';
import YourParty from './YourParty';

export default function OfferDetails({
  offer,
  onBook: onBook,
}: {
  offer: Offer;
  onBook: () => void;
}) {
  const rebooking = useRebooking();

  return (
    <>
      {rebooking.current && (
        <Warning>Rebooking resets the two hour timer</Warning>
      )}
      <ReturnTime {...offer} />
      {offer.changed && (
        <div className="text-sm">
          <strong>Note:</strong> Return time has been changed
        </div>
      )}
      <YourParty
        buttonText={`${rebooking.current ? 'Rebook' : 'Book'} Lightning Lane`}
        onSubmit={onBook}
      />
    </>
  );
}
