import { repository } from '../storage/db.js';

/**
 * Get all characters from pure JSON storage in backend
 * GET /api/characters
 */
export async function getAllCharacters(req, res) {
  try {
    const characters = await repository.getCharacters();
    return res.status(200).json({
      success: true,
      count: characters.length,
      characters
    });
  } catch (error) {
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Failed to retrieve characters from backend JSON file: ' + error.message
    });
  }
}

/**
 * Get a specific character by ID from pure JSON storage in backend
 * GET /api/characters/:id
 */
export async function getCharacterById(req, res) {
  try {
    const { id } = req.params;
    const character = await repository.getCharacterById(id);

    if (!character) {
      return res.status(404).json({
        error: 'CHARACTER_NOT_FOUND',
        message: `Character with id '${id}' was not found in backend JSON storage.`
      });
    }

    return res.status(200).json({
      success: true,
      character
    });
  } catch (error) {
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Failed to retrieve character from backend JSON file: ' + error.message
    });
  }
}

/**
 * Save or insert character into backend JSON file
 * POST /api/characters
 */
export async function saveCharacter(req, res) {
  try {
    const characterData = req.body;
    if (!characterData || !characterData.id || !characterData.name) {
      return res.status(400).json({
        error: 'INVALID_CHARACTER_DATA',
        message: 'Character id and name are required to save in backend JSON.'
      });
    }

    const saved = await repository.saveCharacter(characterData);
    return res.status(200).json({
      success: true,
      message: `Character '${saved.name}' successfully saved in backend/data/characters.json.`,
      character: saved
    });
  } catch (error) {
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Failed to save character in backend JSON file: ' + error.message
    });
  }
}

/**
 * Update an existing character in backend JSON file
 * PUT /api/characters/:id
 */
export async function updateCharacter(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = await repository.updateCharacter(id, updates);
    if (!updated) {
      return res.status(404).json({
        error: 'CHARACTER_NOT_FOUND',
        message: `Character with id '${id}' not found in backend JSON storage.`
      });
    }

    return res.status(200).json({
      success: true,
      message: `Character '${id}' updated in backend/data/characters.json.`,
      character: updated
    });
  } catch (error) {
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Failed to update character in backend JSON file: ' + error.message
    });
  }
}
