import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { API_CONFIG } from '../../core/config/api.config';
import { RelativeService } from './relative.service';

const URL = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.relatives}`;

describe('RelativeService', () => {
  let service: RelativeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RelativeService);
    httpMock = TestBed.inject(HttpTestingController);
    // Effet de session (personne connectée) exécuté avant le test
    TestBed.tick();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('removes a relative opened from its page right away (numeric id from the server)', async () => {
    service.relatives.set([
      { id: '5', name: 'Awa', relation: 'mere' },
      { id: '8', name: 'Modou', relation: 'enfant' },
    ]);

    // La fiche du proche arrive du serveur avec un identifiant numérique
    const opened = firstValueFrom(service.getRelativeById('5'));
    httpMock.expectOne(`${URL}/5`).flush({ id: 5, name: 'Awa', relation: 'MERE' });
    const relative = (await opened)!;
    expect(relative.id).toBe('5');
    expect(relative.relation).toBe('mere');

    const removed = firstValueFrom(service.removeRelative(relative.id));
    expect(service.relatives().map((r) => r.id)).toEqual(['8']);
    httpMock.expectOne({ method: 'DELETE', url: `${URL}/5` }).flush(null);
    expect(await removed).toBe(true);
    expect(service.relatives().map((r) => r.id)).toEqual(['8']);
  });

  it('puts the relative back with an error when the deletion fails', async () => {
    service.relatives.set([{ id: '7', name: 'Fatou', relation: 'soeur' }]);

    const removed = firstValueFrom(service.removeRelative('7'));
    httpMock
      .expectOne({ method: 'DELETE', url: `${URL}/7` })
      .flush({ title: 'Erreur' }, { status: 500, statusText: 'Server Error' });

    expect(await removed).toBe(false);
    expect(service.relatives().map((r) => r.id)).toEqual(['7']);
    expect(service.error()).toBeTruthy();
  });
});
