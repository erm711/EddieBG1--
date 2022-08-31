import { ClientProvider } from '@/contexts/Client';
import { returnTime } from '@/datetime';
import { click, loading, render, screen, within } from '@/testing';
import { client, bookings } from '@/__fixtures__/genie';
import BookingPanel from '../BookingPanel';

const onClose = jest.fn();
const renderComponent = () =>
  render(
    <ClientProvider value={client}>
      <BookingPanel onClose={onClose} />
    </ClientProvider>
  );

describe('BookingPanel', () => {
  jest.useFakeTimers();

  it('renders booking panel', async () => {
    renderComponent();
    const lis = await screen.findAllByRole('listitem');
    bookings.forEach((booking, i) => {
      const inLI = within(lis[i]);
      inLI.getByText(booking.choices ? 'Multiple Experiences' : booking.name);
      inLI.getByText(returnTime(booking));
      expect(!!inLI.queryByTitle('Rebookable')).toBe(
        client.isRebookable(booking)
      );
    });

    click(screen.getAllByText('More')[0]);
    click('Back');

    click(screen.getAllByText('More')[1]);
    click('Cancel');
    click('Select All');
    click('Cancel Reservation');
    screen.getByText(bookings[1].name);
    await loading();
    expect(screen.queryByText(bookings[1].name)).not.toBeInTheDocument();

    click('Close');
    click(screen.getByTestId('panel-shade'));
    jest.runOnlyPendingTimers();
    expect(onClose).toBeCalledTimes(2);
  });

  it('renders empty booking panel', async () => {
    client.bookings.mockResolvedValueOnce([]);
    renderComponent();
    await screen.findByText('No current reservations');
  });
});
