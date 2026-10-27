import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NotificationAlert } from './notification-alert';
import { NotificationService } from '../../services/notification.service';
import { AppNotification } from '../../models/notification';

const yourTurn: AppNotification = {
  id: '7',
  title: "C'est votre tour ! ✂️",
  message: 'Votre coiffeur chez King Barber vous attend maintenant au fauteuil.',
  type: 'ticket',
  recipientRole: 'client',
  createdAt: '2026-10-27T10:00:00Z',
  isRead: false,
  targetRoute: '/client/tickets',
};

describe('NotificationAlert', () => {
  const screenAlert = signal<AppNotification | null>(null);
  const notifications = { screenAlert, dismissScreenAlert: () => screenAlert.set(null) };

  beforeEach(async () => {
    screenAlert.set(null);
    await TestBed.configureTestingModule({
      imports: [NotificationAlert],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();
  });

  async function render(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(NotificationAlert);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('stays hidden without a new notification', async () => {
    const el = await render();

    expect(el.querySelector('.notification-alert')).toBeNull();
  });

  it('shows the new notification and opens its page on tap', async () => {
    screenAlert.set(yourTurn);
    const el = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    expect(el.textContent).toContain("C'est votre tour !");
    expect(el.textContent).toContain('King Barber');

    el.querySelector<HTMLButtonElement>('.notification-alert__body')!.click();

    expect(navigate).toHaveBeenCalledWith('/client/tickets');
    expect(screenAlert()).toBeNull();
  });

  it('closes with the close button', async () => {
    screenAlert.set(yourTurn);
    const el = await render();

    el.querySelector<HTMLButtonElement>('.notification-alert__close')!.click();

    expect(screenAlert()).toBeNull();
  });
});
